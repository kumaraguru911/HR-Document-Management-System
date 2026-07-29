from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.schemas import UserCreate
from app.auth.security import hash_password, verify_password

def get_user_by_email(db: Session, email: str):
    statement = select(User).where(User.email == email)
    return db.scalar(statement)

def create_user(db: Session, data: UserCreate):
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role
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

    if user.hashed_password is None:
        return None
        
    if not verify_password(
        password,
        user.hashed_password
    ):
        return None

    return user