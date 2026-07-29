from datetime import date

from pydantic import BaseModel, EmailStr


class EmployeeCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    department: str
    designation: str
    employment_type: str
    joining_date: date


class EmployeeResponse(BaseModel):
    id: int
    employee_code: str
    first_name: str
    last_name: str
    department: str
    designation: str
    employment_type: str
    joining_date: date

    model_config = {
        "from_attributes": True
    }


class AccountActivation(BaseModel):
    email: EmailStr
    password: str