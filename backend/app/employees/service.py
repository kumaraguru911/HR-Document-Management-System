from datetime import date, datetime, timezone
from urllib.parse import quote

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import AccountStatus, User, UserRole
from app.employees.models import Employee
from app.employees.schemas import EmployeeCreate
from app.auth.security import create_activation_token
from app.automation.service import send_employee_invitation
from app.core.config import settings
from app.documents.models import (
    Document,
    DocumentRequirement,
    DocumentStatus,
    DocumentType
)

def create_employee(
    db: Session,
    data: EmployeeCreate
):
    existing_user = db.scalar(
        select(User).where(
            User.email == data.email
        )
    )

    if existing_user:
        return None

    # Create employee login account as INVITED
    user = User(
        email=data.email,
        hashed_password=None,
        role=UserRole.EMPLOYEE,
        status=AccountStatus.INVITED,
        is_active=False
    )

    db.add(user)
    db.flush()

    # Create employee profile
    employee = Employee(
        employee_code=f"EMP{user.id:04d}",
        user_id=user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        department=data.department,
        designation=data.designation,
        employment_type=data.employment_type,
        joining_date=data.joining_date
    )

    db.add(employee)

    # Save user + employee first
    db.commit()
    db.refresh(employee)

    # Generate secure activation token
    activation_token = create_activation_token(
    user.id
    )

    employee_name = (
        f"{employee.first_name} "
        f"{employee.last_name}"
    ).strip()

    # Build frontend activation URL
    activation_url = (
        f"{settings.frontend_url.rstrip('/')}"
        f"/activate?token={activation_token}"
    )

    if employee_name:
        activation_url = (
            f"{activation_url}&name={quote(employee_name)}"
        )

    # Send invitation through n8n
    invitation_sent = send_employee_invitation(
        employee_email=user.email,
        employee_name=employee_name,
        activation_url=activation_url
    )

    return employee, invitation_sent


def resend_invitation(
    db: Session,
    employee_id: int
):
    employee = db.get(
        Employee,
        employee_id
    )

    if employee is None:
        return None

    user = employee.user

    # Only invited (or inactive) employees can be re-invited
    if (
        user.status != AccountStatus.INVITED
        and user.status != AccountStatus.INACTIVE
    ):
        return False

    # Generate a fresh activation token
    activation_token = create_activation_token(
        user.id
    )

    employee_name = (
        f"{employee.first_name} "
        f"{employee.last_name}"
    ).strip()

    # Build frontend activation URL
    activation_url = (
        f"{settings.frontend_url.rstrip('/')}"
        f"/activate?token={activation_token}"
    )

    if employee_name:
        activation_url = (
            f"{activation_url}&name={quote(employee_name)}"
        )

    # Send invitation through n8n
    invitation_sent = send_employee_invitation(
        employee_email=user.email,
        employee_name=employee_name,
        activation_url=activation_url
    )

    return employee, invitation_sent

def get_employees(
    db: Session
):
    employees = db.scalars(
        select(Employee)
        .order_by(Employee.id.desc())
    ).all()

    return [
        {
            "id": employee.id,
            "user_id": employee.user_id,
            "employee_code": employee.employee_code,
            "email": employee.user.email,

            "first_name": employee.first_name,
            "last_name": employee.last_name,

            "department": employee.department,
            "designation": employee.designation,
            "employment_type": employee.employment_type,
            "joining_date": employee.joining_date,

            "account_status": employee.user.status.value,
            "is_active": employee.user.is_active,
        }
        for employee in employees
    ]


def get_employee_readiness(db: Session):
    """Return a prioritized, explainable readiness queue for HR.

    The score deliberately uses only verifiable onboarding data: account activation
    and the latest submission for every required document. This keeps the result
    auditable and avoids hiding a decision behind an opaque algorithm.
    """
    employees = db.scalars(select(Employee).order_by(Employee.joining_date.asc())).all()
    today = date.today()
    now = datetime.now(timezone.utc)
    readiness = []

    for employee in employees:
        requirements = db.scalars(
            select(DocumentRequirement)
            .join(DocumentType)
            .where(
                DocumentRequirement.employment_type == employee.employment_type.upper(),
                DocumentRequirement.is_required.is_(True),
                DocumentType.is_active.is_(True),
            )
        ).all()

        approved = pending = missing = rejected = 0
        oldest_pending_days = 0

        for requirement in requirements:
            latest_document = db.scalar(
                select(Document)
                .where(
                    Document.employee_id == employee.id,
                    Document.document_type_id == requirement.document_type_id,
                )
                .order_by(Document.uploaded_at.desc())
                .limit(1)
            )

            if latest_document is None:
                missing += 1
            elif latest_document.status == DocumentStatus.APPROVED:
                approved += 1
            elif latest_document.status == DocumentStatus.PENDING:
                pending += 1
                uploaded_at = latest_document.uploaded_at
                if uploaded_at.tzinfo is None:
                    uploaded_at = uploaded_at.replace(tzinfo=timezone.utc)
                oldest_pending_days = max(oldest_pending_days, (now - uploaded_at).days)
            else:
                rejected += 1

        required = len(requirements)
        document_score = 100 if required == 0 else round((approved * 100 + pending * 50) / required)
        account_activated = employee.user.is_active
        score = min(document_score, 25) if not account_activated else document_score
        days_until_joining = (employee.joining_date - today).days
        reasons = []

        if not account_activated:
            reasons.append("Account has not been activated")
        if missing:
            reasons.append(f"{missing} required document{'s' if missing != 1 else ''} missing")
        if rejected:
            reasons.append(f"{rejected} document{'s' if rejected != 1 else ''} need resubmission")
        if oldest_pending_days >= 2:
            reasons.append(f"A document has waited {oldest_pending_days} days for review")
        if days_until_joining <= 7 and score < 100:
            deadline = "Joining date has passed" if days_until_joining < 0 else f"Joining in {days_until_joining} day{'s' if days_until_joining != 1 else ''}"
            reasons.append(deadline)

        if (days_until_joining <= 7 and score < 100) or rejected or missing >= 2:
            risk_level = "HIGH"
        elif score < 75 or not account_activated or pending:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        if pending:
            next_action = "Review pending document submissions"
        elif not account_activated:
            next_action = "Resend the activation invitation"
        elif missing or rejected:
            next_action = "Ask employee to complete required documents"
        else:
            next_action = "Ready for onboarding"

        readiness.append({
            "employee_id": employee.id,
            "employee_name": f"{employee.first_name} {employee.last_name}".strip(),
            "employee_code": employee.employee_code,
            "department": employee.department,
            "joining_date": employee.joining_date,
            "days_until_joining": days_until_joining,
            "readiness_score": score,
            "risk_level": risk_level,
            "required_documents": required,
            "approved_documents": approved,
            "pending_documents": pending,
            "missing_documents": missing,
            "rejected_documents": rejected,
            "account_activated": account_activated,
            "risk_reasons": reasons,
            "next_action": next_action,
        })

    risk_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    return sorted(readiness, key=lambda item: (risk_order[item["risk_level"]], item["readiness_score"], item["joining_date"]))

def get_employee_by_id(
    db: Session,
    employee_id: int
):
    employee = db.get(
        Employee,
        employee_id
    )

    if employee is None:
        return None

    return {
        "id": employee.id,
        "user_id": employee.user_id,
        "employee_code": employee.employee_code,
        "email": employee.user.email,

        "first_name": employee.first_name,
        "last_name": employee.last_name,

        "department": employee.department,
        "designation": employee.designation,
        "employment_type": employee.employment_type,
        "joining_date": employee.joining_date,

        "account_status": employee.user.status.value,
        "is_active": employee.user.is_active,
    }

def deactivate_employee(
    db: Session,
    employee_id: int
):
    employee = db.get(
        Employee,
        employee_id
    )

    if employee is None:
        return None

    user = employee.user

    # Only ACTIVE accounts can be deactivated
    if (
        user.status != AccountStatus.ACTIVE
        or not user.is_active
    ):
        return False

    user.status = AccountStatus.INACTIVE
    user.is_active = False

    db.commit()
    db.refresh(employee)

    return {
        "id": employee.id,
        "user_id": employee.user_id,
        "employee_code": employee.employee_code,
        "email": employee.user.email,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "department": employee.department,
        "designation": employee.designation,
        "employment_type": employee.employment_type,
        "joining_date": employee.joining_date,
        "account_status": employee.user.status.value,
        "is_active": employee.user.is_active,
    }


def reactivate_employee(
    db: Session,
    employee_id: int
):
    employee = db.get(
        Employee,
        employee_id
    )

    if employee is None:
        return None

    user = employee.user

    # Only previously deactivated accounts can be reactivated
    if (
        user.status != AccountStatus.INACTIVE
        or user.is_active
    ):
        return False

    # A valid activated employee should already have a password
    if user.hashed_password is None:
        return False

    user.status = AccountStatus.ACTIVE
    user.is_active = True

    db.commit()
    db.refresh(employee)

    return {
        "id": employee.id,
        "user_id": employee.user_id,
        "employee_code": employee.employee_code,
        "email": employee.user.email,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "department": employee.department,
        "designation": employee.designation,
        "employment_type": employee.employment_type,
        "joining_date": employee.joining_date,
        "account_status": employee.user.status.value,
        "is_active": employee.user.is_active,
    }
