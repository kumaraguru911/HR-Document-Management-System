from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.audit.models import AuditAction
from app.audit.schemas import AuditLogResponse
from app.audit.service import get_audit_logs
from app.auth.dependencies import require_hr
from app.auth.models import User
from app.database.session import get_db


router = APIRouter(
    prefix="/audit",
    tags=["Audit"]
)


@router.get(
    "",
    response_model=list[AuditLogResponse]
)
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
    action: AuditAction | None = None,
    user_id: int | None = None,
    document_id: int | None = None,
    search: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None
):
    return get_audit_logs(
        db,
        action=action,
        user_id=user_id,
        document_id=document_id,
        search=search,
        start_date=start_date,
        end_date=end_date
    )
