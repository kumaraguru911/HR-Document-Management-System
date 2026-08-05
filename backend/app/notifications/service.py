from sqlalchemy import select
from sqlalchemy.orm import Session

from app.notifications.models import (
    Notification,
    NotificationType
)


def create_notification(
    db: Session,
    user_id: int,
    notification_type: NotificationType,
    title: str,
    message: str,
    document_id: int | None = None
):
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        document_id=document_id
    )

    db.add(notification)

    return notification


def get_user_notifications(
    db: Session,
    user_id: int
):
    return db.scalars(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
    ).all()


def mark_notification_as_read(
    db: Session,
    notification_id: int,
    user_id: int
):
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
    )

    if notification is None:
        return None

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return notification


def mark_all_notifications_as_read(
    db: Session,
    user_id: int
):
    notifications = db.scalars(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False)
        )
    ).all()

    if not notifications:
        return []

    for notification in notifications:
        notification.is_read = True

    db.commit()

    return notifications