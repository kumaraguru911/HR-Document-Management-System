from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_hr
from app.auth.models import User
from app.auth.schemas import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserResponse
)
import jwt
from jwt.exceptions import InvalidTokenError
from app.core.config import settings
from app.auth.security import (
    create_access_token,
    create_2fa_challenge_token,
    hash_password
)
from app.auth.schemas import LoginResponse
from app.auth.schemas import (
    TwoFASetupResponse,
    TwoFAVerifyRequest,
    TwoFALoginRequest
)

from app.auth.two_factor import (
    generate_totp_secret,
    generate_provisioning_uri,
    verify_totp
)
from app.auth.service import (
    authenticate_user,
    create_user,
    get_user_by_email
)
from app.database.session import get_db

from sqlalchemy import select

from app.auth.models import AccountStatus
from app.auth.schemas import ActivateAccountRequest
from app.auth.security import hash_password

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(data: UserCreate, db: Session = Depends(get_db)):

    if get_user_by_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    return create_user(db, data)


@router.post("/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = authenticate_user(
        db,
        data.email,
        data.password
    )

    # Invalid email/password
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 2FA enabled → issue challenge token
    if user.is_2fa_enabled:
        challenge_token = create_2fa_challenge_token(
            user.id
        )

        return LoginResponse(
            requires_2fa=True,
            challenge_token=challenge_token
        )

    # No 2FA → issue normal access token
    token = create_access_token(
        user.id,
        user.role.value
    )

    return LoginResponse(
        requires_2fa=False,
        access_token=token
    )
    
@router.post(
    "/login/2fa",
    response_model=TokenResponse
)
def login_2fa(
    data: TwoFALoginRequest,
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(
            data.challenge_token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )

        if payload.get("purpose") != "2fa":
            raise InvalidTokenError()

        user_id = int(payload["sub"])

    except (InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired 2FA challenge"
        )

    user = db.get(User, user_id)

    if (
        user is None
        or not user.is_active
        or not user.is_2fa_enabled
        or user.totp_secret is None
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to complete 2FA"
        )

    if not verify_totp(
        user.totp_secret,
        data.otp
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP"
        )

    access_token = create_access_token(
        user.id,
        user.role.value
    )

    return TokenResponse(
        access_token=access_token
    )

@router.post(
    "/2fa/setup",
    response_model=TwoFASetupResponse
)
def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )

    secret = generate_totp_secret()

    current_user.totp_secret = secret
    db.commit()

    provisioning_uri = generate_provisioning_uri(
        secret,
        current_user.email
    )

    return TwoFASetupResponse(
        secret=secret,
        provisioning_uri=provisioning_uri
    )

@router.post("/2fa/confirm")
def confirm_2fa(
    data: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )

    if current_user.totp_secret is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup has not been started"
        )

    if not verify_totp(
        current_user.totp_secret,
        data.otp
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )

    current_user.is_2fa_enabled = True

    db.commit()

    return {
        "message": "2FA enabled successfully"
    }

@router.post("/activate")
def activate_account(
    data: ActivateAccountRequest,
    db: Session = Depends(get_db)
):
    user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )

    if user.status != AccountStatus.INVITED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account cannot be activated"
        )

    user.hashed_password = hash_password(data.password)
    user.status = AccountStatus.ACTIVE
    user.is_active = True

    db.commit()

    return {
        "message": "Account activated successfully"
    }

@router.get("/me", response_model=UserResponse)
def me(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.get("/hr-test")
def hr_test(
    current_user: User = Depends(require_hr)
):
    return {
        "message": "You have HR access",
        "user": current_user.email
    }