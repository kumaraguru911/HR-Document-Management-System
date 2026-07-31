from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import AccountStatus, User, UserRole
from app.auth.security import hash_password, verify_password
from app.auth.schemas import HRRegisterRequest  

def get_user_by_email(db: Session, email: str):
    statement = select(User).where(User.email == email)
    return db.scalar(statement)

def create_hr_user(
    db: Session,
    data: HRRegisterRequest
):
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.HR,
        status=AccountStatus.ACTIVE,
        is_active=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

def authenticate_user(
    db: Session,
    email: str,
    password: str
):
    user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if user is None:
        return None

    # Only active accounts are allowed to authenticate
    if (
        not user.is_active
        or user.status != AccountStatus.ACTIVE
    ):
        return None

    if user.hashed_password is None:
        return None

    if not verify_password(
        password,
        user.hashed_password
    ):
        return None

    return user 