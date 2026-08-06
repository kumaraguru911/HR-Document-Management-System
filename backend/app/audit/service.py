from datetime import date, datetime, timedelta, time

from sqlalchemy import or_, select, func
from sqlalchemy.orm import Session, selectinload

from app.auth.models import User
from app.audit.models import AuditAction, AuditLog
from app.documents.models import Document, DocumentType
from app.employees.models import Employee


def create_audit_log(
    db: Session,
    user_id: int,
    action: AuditAction,
    document_id: int | None = None,
    details: str | None = None
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        document_id=document_id,
        details=details
    )

    db.add(log)

    return log


def get_audit_logs(
    db: Session,
    action: AuditAction | None = None,
    user_id: int | None = None,
    document_id: int | None = None,
    search: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None
):
    statement = (
        select(AuditLog)
        .options(
            selectinload(AuditLog.user),
            selectinload(AuditLog.document).selectinload(Document.document_type),
            selectinload(AuditLog.document).selectinload(Document.employee)
        )
        .order_by(AuditLog.created_at.desc())
    )

    if action is not None:
        statement = statement.where(AuditLog.action == action)

    if user_id is not None:
        statement = statement.where(AuditLog.user_id == user_id)

    if document_id is not None:
        statement = statement.where(AuditLog.document_id == document_id)

    if start_date is not None:
        statement = statement.where(
            AuditLog.created_at >= datetime.combine(start_date, time.min)
        )

    if end_date is not None:
        statement = statement.where(
            AuditLog.created_at < datetime.combine(end_date + timedelta(days=1), time.min)
        )

    if search:
        normalized = f"%{search.lower()}%"
        statement = statement.join(AuditLog.user).outerjoin(AuditLog.document).outerjoin(Document.document_type).outerjoin(Document.employee).where(
            or_(
                func.lower(func.coalesce(AuditLog.details, "")).like(normalized),
                func.lower(func.coalesce(User.email, "")).like(normalized),
                func.lower(func.coalesce(Document.original_filename, "")).like(normalized),
                func.lower(func.coalesce(DocumentType.name, "")).like(normalized),
                func.lower(func.coalesce(Employee.first_name, "")).like(normalized),
                func.lower(func.coalesce(Employee.last_name, "")).like(normalized),
                func.lower(func.coalesce(Employee.employee_code, "")).like(normalized)
            )
        )

    return db.scalars(statement).all()
