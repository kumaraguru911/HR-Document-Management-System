from datetime import datetime

from pydantic import BaseModel

from app.notifications.models import NotificationType


class NotificationResponse(BaseModel):
    id: int
    type: NotificationType
    title: str
    message: str
    document_id: int | None
    document_name: str | None = None
    is_read: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
