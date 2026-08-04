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

    # Build frontend activation URL
    activation_url = (
        f"{settings.frontend_url.rstrip('/')}"
        f"/activate?token={activation_token}"
    )

    employee_name = (
        f"{employee.first_name} "
        f"{employee.last_name}"
    )

    # Send invitation through n8n
    send_employee_invitation(
        employee_email=user.email,
        employee_name=employee_name,
        activation_url=activation_url
    )

    return employee

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

    return employee


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

    return employee