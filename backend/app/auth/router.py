from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

import jwt
from jwt.exceptions import InvalidTokenError

from app.auth.dependencies import get_current_user, require_hr
from app.auth.models import AccountStatus, User, UserRole

from app.auth.schemas import (
    ActivateAccountRequest,
    HRRegisterRequest,
    LoginRequest,
    LoginResponse,
    ProfileUpdateRequest,
    TokenResponse,
    TwoFADisableRequest,
    TwoFALoginRequest,
    TwoFASetupResponse,
    TwoFAVerifyRequest,
    UserResponse,
)

from app.auth.security import (
    create_access_token,
    create_2fa_challenge_token,
    hash_password,
)

from app.auth.service import (
    authenticate_user,
    create_hr_user,
)

from app.auth.two_factor import (
    generate_provisioning_uri,
    generate_totp_secret,
    verify_totp,
)

from app.core.config import settings
from app.database.session import get_db
from app.employees.models import Employee


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_hr(
    data: HRRegisterRequest,
    db: Session = Depends(get_db)
):
    existing_hr = db.scalar(
        select(User).where(
            User.role == UserRole.HR,
            User.is_active.is_(True),
        )
    )

    if existing_hr is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR registration is closed"
        )

    return create_hr_user(
        db,
        data
    )

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
        or user.status != AccountStatus.ACTIVE
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

@router.post("/2fa/disable")
def disable_2fa(
    data: TwoFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (
        not current_user.is_2fa_enabled
        or current_user.totp_secret is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )

    if not verify_totp(
        current_user.totp_secret,
        data.otp
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )

    current_user.is_2fa_enabled = False
    current_user.totp_secret = None

    db.commit()

    return {
        "message": "2FA disabled successfully"
    }

@router.post("/activate")
def activate_account(
    data: ActivateAccountRequest,
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(
            data.token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )

        if payload.get("purpose") != "account_activation":
            raise InvalidTokenError()

        user_id = int(payload["sub"])

    except (InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired activation token"
        )

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )

    if (
    user.status != AccountStatus.INVITED
    or user.role != UserRole.EMPLOYEE
    or user.is_active
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account cannot be activated"
        )

    user.hashed_password = hash_password(
        data.password
    )

    user.status = AccountStatus.ACTIVE
    user.is_active = True
    user.totp_secret = None
    user.is_2fa_enabled = False

    db.commit()

    return {
        "message": "Account activated successfully"
    }
def _build_user_response(db: Session, current_user: User) -> UserResponse:
    employee_profile = db.scalar(
        select(Employee).where(Employee.user_id == current_user.id)
    )

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        is_2fa_enabled=current_user.is_2fa_enabled,
        first_name=employee_profile.first_name if employee_profile else None,
        last_name=employee_profile.last_name if employee_profile else None,
        is_employee_profile=employee_profile is not None,
    )


@router.get("/me", response_model=UserResponse)
def me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return _build_user_response(db, current_user)


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.email is not None and data.email != current_user.email:
        existing_user = db.scalar(
            select(User).where(User.email == data.email, User.id != current_user.id)
        )

        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use"
            )

        current_user.email = data.email

    employee_profile = db.scalar(
        select(Employee).where(Employee.user_id == current_user.id)
    )

    if data.first_name is not None or data.last_name is not None:
        if employee_profile is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee profile not found for name updates"
            )

        if data.first_name is not None:
            employee_profile.first_name = data.first_name

        if data.last_name is not None:
            employee_profile.last_name = data.last_name

    db.commit()

    return _build_user_response(db, current_user)


@router.get("/hr-test")
def hr_test(
    current_user: User = Depends(require_hr)
):
    return {
        "message": "You have HR access",
        "user": current_user.email
    }