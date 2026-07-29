from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

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
    current_user: User = Depends(require_hr)
):
    return get_audit_logs(db)