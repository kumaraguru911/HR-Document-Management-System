from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_hr
from app.auth.models import User
from app.database.session import get_db

from app.employees.schemas import (
    EmployeeCreate,
    EmployeeListResponse,
    EmployeeResponse,
)

from app.employees.service import (
    create_employee,
    deactivate_employee,
    get_employee_by_id,
    get_employees,
    reactivate_employee,
)


router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)


# HR - Create employee
@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED
)
def add_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    employee = create_employee(
        db,
        data
    )

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )

    return employee


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
    employee = deactivate_employee(
        db,
        employee_id
    )

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    if employee is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active employees can be deactivated"
        )

    return get_employee_by_id(
        db,
        employee_id
    )


@router.patch(
    "/{employee_id}/reactivate",
    response_model=EmployeeListResponse
)
def reactivate_employee_account(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    employee = reactivate_employee(
        db,
        employee_id
    )

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    if employee is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only inactive employees can be reactivated"
        )

    return get_employee_by_id(
        db,
        employee_id
    )