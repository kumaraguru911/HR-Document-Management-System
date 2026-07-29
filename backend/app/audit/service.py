from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.models import AuditAction, AuditLog


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


def get_audit_logs(db: Session):
    return db.scalars(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
    ).all()