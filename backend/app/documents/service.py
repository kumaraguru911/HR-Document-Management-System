from sqlalchemy import select
from sqlalchemy.orm import Session

from app.documents.models import (
    DocumentRequirement,
    DocumentType,
    Document,
    DocumentStatus
)
from app.documents.schemas import (
    DocumentRequirementCreate,
    DocumentTypeCreate
)

from app.auth.models import User, UserRole
from pathlib import Path
from uuid import uuid4

from app.storage.minio import (
    upload_file,
    get_presigned_download_url
)
from app.employees.models import Employee

from datetime import datetime, timezone

from app.audit.models import AuditAction
from app.audit.service import create_audit_log

from app.notifications.models import NotificationType
from app.notifications.service import create_notification

from app.automation.service import send_n8n_event

def create_document_type(
    db: Session,
    data: DocumentTypeCreate
):
    existing = db.scalar(
        select(DocumentType).where(
            DocumentType.name == data.name
        )
    )

    if existing:
        return None

    document_type = DocumentType(
        name=data.name,
        description=data.description
    )

    db.add(document_type)
    db.commit()
    db.refresh(document_type)

    return document_type


def get_document_types(db: Session):
    return db.scalars(
        select(DocumentType).order_by(DocumentType.name)
    ).all()


def create_requirement(
    db: Session,
    data: DocumentRequirementCreate
):
    document_type = db.get(
        DocumentType,
        data.document_type_id
    )

    if document_type is None:
        return None

    requirement = DocumentRequirement(
        document_type_id=data.document_type_id,
        employment_type=data.employment_type.upper(),
        is_required=data.is_required
    )

    db.add(requirement)
    db.commit()
    db.refresh(requirement)

    return requirement

def get_my_documents(
    db: Session,
    user_id: int
):
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == user_id
        )
    )

    if employee is None:
        return None

    return db.scalars(
        select(Document)
        .where(
            Document.employee_id == employee.id
        )
        .order_by(Document.uploaded_at.desc())
    ).all()

def get_employee_checklist(
    db: Session,
    user_id: int
):
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == user_id
        )
    )

    if employee is None:
        return None

    requirements = db.scalars(
        select(DocumentRequirement)
        .join(DocumentType)
        .where(
            DocumentRequirement.employment_type
            == employee.employment_type.upper(),

            DocumentRequirement.is_required.is_(True),

            DocumentType.is_active.is_(True)
        )
        .order_by(DocumentType.name)
    ).all()

    checklist = []

    for requirement in requirements:

        latest_document = db.scalar(
            select(Document)
            .where(
                Document.employee_id == employee.id,
                Document.document_type_id
                == requirement.document_type_id
            )
            .order_by(Document.uploaded_at.desc())
            .limit(1)
        )

        if latest_document is None:
            document_status = "MISSING"
        else:
            document_status = latest_document.status.value

        checklist.append(
            {
                "document_type_id":
                    requirement.document_type.id,

                "name":
                    requirement.document_type.name,

                "description":
                    requirement.document_type.description,

                "required": True,

                "status": document_status
            }
        )

    return checklist

def get_document_access(
    db: Session,
    document_id: int,
    current_user: User
):
    document = db.get(
        Document,
        document_id
    )

    if document is None:
        return None

    # HR can access employee documents
    if current_user.role == UserRole.HR:
        allowed = True

    else:
        employee = db.scalar(
            select(Employee).where(
                Employee.user_id == current_user.id
            )
        )

        allowed = (
            employee is not None
            and document.employee_id == employee.id
        )

    if not allowed:
        return False

    url = get_presigned_download_url(
        document.object_key
    )

    return {
        "document_id": document.id,
        "filename": document.original_filename,
        "content_type": document.content_type,
        "url": url,
        "expires_in": 300
    }

def get_employee_documents(db: Session, employee_id: int):
    employee = db.get(Employee, employee_id)

    if employee is None:
        return []

    documents = db.scalars(
        select(Document)
        .where(
            Document.employee_id == employee.id
        )
        .order_by(Document.uploaded_at.desc())
    ).all()

    return [
        {
            "id": document.id,

            "employee_id": document.employee.id,
            "employee_code": document.employee.employee_code,
            "employee_name":
                f"{document.employee.first_name} "
                f"{document.employee.last_name}",

            "document_type_id": document.document_type.id,
            "document_type_name":
                document.document_type.name,

            "original_filename":
                document.original_filename,

            "content_type":
                document.content_type,

            "file_size":
                document.file_size,

            "status":
                document.status,

            "uploaded_at":
                document.uploaded_at,

            "rejection_reason":
                document.rejection_reason
        }

        for document in documents
    ]


def get_pending_documents(db: Session):

    documents = db.scalars(
        select(Document)
        .where(
            Document.status == DocumentStatus.PENDING
        )
        .order_by(Document.uploaded_at.asc())
    ).all()

    return [
        {
            "id": document.id,

            "employee_id": document.employee.id,
            "employee_code": document.employee.employee_code,
            "employee_name":
                f"{document.employee.first_name} "
                f"{document.employee.last_name}",

            "document_type_id": document.document_type.id,
            "document_type_name":
                document.document_type.name,

            "original_filename":
                document.original_filename,

            "content_type":
                document.content_type,

            "file_size":
                document.file_size,

            "status":
                document.status,

            "uploaded_at":
                document.uploaded_at,

            "rejection_reason":
                document.rejection_reason
        }

        for document in documents
    ]

def upload_employee_document(
    db: Session,
    employee: Employee,
    document_type: DocumentType,
    filename: str,
    content_type: str,
    file_data: bytes,
    user_id: int
):
    existing_pending = db.scalar(
        select(Document).where(
            Document.employee_id == employee.id,
            Document.document_type_id == document_type.id,
            Document.status == DocumentStatus.PENDING
        )
    )

    if existing_pending:
        return False
        
    extension = Path(filename).suffix.lower()

    object_key = (
        f"employees/{employee.id}/"
        f"{document_type.id}/"
        f"{uuid4()}{extension}"
    )

    upload_file(
        object_key=object_key,
        data=file_data,
        content_type=content_type
    )

    document = Document(
        employee_id=employee.id,
        document_type_id=document_type.id,
        original_filename=filename,
        object_key=object_key,
        content_type=content_type,
        file_size=len(file_data)
    )

    db.add(document)

    # Get document.id before committing
    db.flush()

    # -------------------------
    # Audit log
    # -------------------------

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.DOCUMENT_UPLOADED,
        document_id=document.id,
        details=f"Uploaded {filename}"
    )

    # -------------------------
    # Notify HR users
    # -------------------------

    hr_users = db.scalars(
        select(User).where(
            User.role == UserRole.HR
        )
    ).all()

    employee_name = (
        f"{employee.first_name} {employee.last_name}"
    )

    for hr_user in hr_users:
        create_notification(
            db=db,
            user_id=hr_user.id,
            notification_type=NotificationType.DOCUMENT_UPLOADED,
            title="New Document Uploaded",
            message=(
                f"{employee_name} uploaded "
                f"{document_type.name}. "
                f"Review required."
            ),
            document_id=document.id
        )

    # Commit document + audit log + notifications together
    db.commit()

    db.refresh(document)

    return document

def approve_document(
    db: Session,
    document_id: int,
    reviewer_id: int
):
    document = db.get(
        Document,
        document_id
    )

    if document is None:
        return None

    if document.status != DocumentStatus.PENDING:
        return False

    document.status = DocumentStatus.APPROVED
    document.reviewed_by = reviewer_id
    document.reviewed_at = datetime.now(timezone.utc)
    document.rejection_reason = None

    create_audit_log(
    db=db,
    user_id=reviewer_id,
    action=AuditAction.DOCUMENT_APPROVED,
    document_id=document.id,
    details="Document approved by HR"
)
    employee = db.get(
    Employee,
    document.employee_id
    )

    if employee is not None:
        create_notification(
            db=db,
            user_id=employee.user_id,
            notification_type=NotificationType.DOCUMENT_APPROVED,
            title=f"{document.document_type.name} Approved",
            message=f"Your {document.document_type.name} has been approved by HR.",
            document_id=document.id
        )
    db.commit()
    db.refresh(document)

    return document

def reject_document(
    db: Session,
    document_id: int,
    reviewer_id: int,
    reason: str
):
    document = db.get(
        Document,
        document_id
    )

    if document is None:
        return None

    if document.status != DocumentStatus.PENDING:
        return False

    document.status = DocumentStatus.REJECTED
    document.reviewed_by = reviewer_id
    document.reviewed_at = datetime.now(timezone.utc)
    document.rejection_reason = reason

    create_audit_log(
        db=db,
        user_id=reviewer_id,
        action=AuditAction.DOCUMENT_REJECTED,
        document_id=document.id,
        details=reason
    )

    employee = db.get(
        Employee,
        document.employee_id
    )

    document_type = db.get(
        DocumentType,
        document.document_type_id
    )

    user = None

    if employee is not None:
        user = db.get(
            User,
            employee.user_id
        )

        create_notification(
            db=db,
            user_id=employee.user_id,
            notification_type=NotificationType.DOCUMENT_REJECTED,
            title=f"{document_type.name} Rejected",
            message=f"Your {document_type.name} was rejected: {reason}",
            document_id=document.id
        )

    db.commit()
    db.refresh(document)

    if (
        employee is not None
        and user is not None
        and document_type is not None
    ):
        send_n8n_event(
            event="DOCUMENT_REJECTED",
            employee_email=user.email,
            employee_name=f"{employee.first_name} {employee.last_name}",
            document_name=document_type.name,
            reason=reason
        )

    return document
