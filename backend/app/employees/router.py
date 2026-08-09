from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_hr
from app.auth.models import User
from app.database.session import get_db

from app.employees.schemas import (
    EmployeeCreate,
    EmployeeInviteResponse,
    EmployeeListResponse,
    EmployeeReadinessResponse,
    EmployeeResponse,
)

from app.employees.service import (
    create_employee,
    deactivate_employee,
    get_employee_by_id,
    get_employees,
    get_employee_readiness,
    reactivate_employee,
    resend_invitation,
)


router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)


# HR - Create employee
@router.post(
    "",
    response_model=EmployeeInviteResponse,
    status_code=status.HTTP_201_CREATED
)
def add_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    result = create_employee(
        db,
        data
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )

    employee, invitation_sent = result

    return {
        **{
            "id": employee.id,
            "user_id": employee.user_id,
            "employee_code": employee.employee_code,
            "email": employee.user.email,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "department": employee.department,
            "designation": employee.designation,
            "employment_type": employee.employment_type,
            "joining_date": employee.joining_date,
            "account_status": employee.user.status.value,
            "is_active": employee.user.is_active,
        },
        "invitation_sent": invitation_sent,
    }


# HR - List all employees
@router.get(
    "",
    response_model=list[EmployeeListResponse]
)
def list_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    return get_employees(db)


@router.get(
    "/readiness",
    response_model=list[EmployeeReadinessResponse]
)
def employee_readiness_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    """Prioritized readiness and risk signals for the HR dashboard."""
    return get_employee_readiness(db)

@router.get(
    "/{employee_id}",
    response_model=EmployeeListResponse
)
def employee_details(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    employee = get_employee_by_id(
        db,
        employee_id
    )

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    return employee

@router.patch(
    "/{employee_id}/deactivate",
    response_model=EmployeeListResponse
)
def deactivate_employee_account(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    employee_data = deactivate_employee(
        db,
        employee_id
    )

    if employee_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    if employee_data is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active employees can be deactivated"
        )

    return employee_data


@router.patch(
    "/{employee_id}/reactivate",
    response_model=EmployeeListResponse
)
def reactivate_employee_account(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    employee_data = reactivate_employee(
        db,
        employee_id
    )

    if employee_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    if employee_data is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only inactive employees can be reactivated"
        )

    return employee_data


@router.post(
    "/{employee_id}/resend-invitation",
    response_model=EmployeeInviteResponse
)
def resend_employee_invitation(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    result = resend_invitation(
        db,
        employee_id
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    if result is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only invited or inactive employees can be re-invited"
        )

    employee, invitation_sent = result

    return {
        **{
            "id": employee.id,
            "user_id": employee.user_id,
            "employee_code": employee.employee_code,
            "email": employee.user.email,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "department": employee.department,
            "designation": employee.designation,
            "employment_type": employee.employment_type,
            "joining_date": employee.joining_date,
            "account_status": employee.user.status.value,
            "is_active": employee.user.is_active,
        },
        "invitation_sent": invitation_sent,
    }
