from datetime import datetime

from pydantic import BaseModel

from app.audit.models import AuditAction


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: AuditAction
    document_id: int | None
    details: str | None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }