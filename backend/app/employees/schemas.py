from datetime import date

from pydantic import BaseModel, EmailStr

import enum


class EmploymentType(str, enum.Enum):
    FULL_TIME = "FULL_TIME"
    CONTRACT = "CONTRACT"

class EmployeeCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    department: str
    designation: str
    employment_type: EmploymentType
    joining_date: date


class EmployeeResponse(BaseModel):
    id: int
    user_id: int
    employee_code: str
    first_name: str
    last_name: str
    department: str
    designation: str
    employment_type: EmploymentType
    joining_date: date

    model_config = {
        "from_attributes": True
    }


class EmployeeListResponse(BaseModel):
    id: int
    user_id: int
    employee_code: str
    email: EmailStr

    first_name: str
    last_name: str

    department: str
    designation: str
    employment_type: EmploymentType
    joining_date: date

    account_status: str
    is_active: bool


class EmployeeInviteResponse(BaseModel):
    id: int
    user_id: int
    employee_code: str
    email: EmailStr

    first_name: str
    last_name: str

    department: str
    designation: str
    employment_type: EmploymentType
    joining_date: date

    account_status: str
    is_active: bool

    invitation_sent: bool


class EmployeeReadinessResponse(BaseModel):
    """An explainable onboarding readiness assessment for the HR action queue."""

    employee_id: int
    employee_name: str
    employee_code: str
    department: str
    joining_date: date
    days_until_joining: int
    readiness_score: int
    risk_level: str
    required_documents: int
    approved_documents: int
    pending_documents: int
    missing_documents: int
    rejected_documents: int
    account_activated: bool
    risk_reasons: list[str]
    next_action: str
