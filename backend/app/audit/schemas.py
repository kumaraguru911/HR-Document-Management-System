from datetime import datetime

from pydantic import BaseModel

from app.audit.models import AuditAction


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    user_email: str | None
    user_name: str | None
    action: AuditAction
    document_id: int | None
    document_name: str | None
    document_type: str | None
    employee_code: str | None
    employee_name: str | None
    details: str | None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
