from pydantic import BaseModel, EmailStr, Field

from app.auth.models import UserRole

from pydantic import BaseModel, ConfigDict, EmailStr, Field

class HRRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    model_config = ConfigDict(
        extra="forbid"
    )

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    is_active: bool
    is_2fa_enabled: bool

    model_config = {
        "from_attributes": True
    }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ActivateAccountRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)

class TwoFASetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class TwoFAVerifyRequest(BaseModel):
    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$"
    )


class TwoFALoginRequest(BaseModel):
    challenge_token: str
    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$"
    )


class LoginResponse(BaseModel):
    requires_2fa: bool
    access_token: str | None = None
    challenge_token: str | None = None
    token_type: str = "bearer"

class TwoFADisableRequest(BaseModel):
    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$"
    )