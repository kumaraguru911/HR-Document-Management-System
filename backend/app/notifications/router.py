from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database.session import get_db
from app.notifications.schemas import NotificationResponse
from app.notifications.service import (
    get_user_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get(
    "/my",
    response_model=list[NotificationResponse]
)
def my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_notifications(
        db,
        current_user.id
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse
)
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = mark_notification_as_read(
        db,
        notification_id,
        current_user.id
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    return notification


@router.patch(
    "/read-all",
    response_model=list[NotificationResponse]
)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return mark_all_notifications_as_read(
        db,
        current_user.id
    )