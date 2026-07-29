from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import AccountStatus, User, UserRole
from app.employees.models import Employee
from app.employees.schemas import EmployeeCreate


def create_employee(db: Session, data: EmployeeCreate):
    existing_user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if existing_user:
        return None

    user = User(
        email=data.email,
        hashed_password=None,
        role=UserRole.EMPLOYEE,
        status=AccountStatus.INVITED,
        is_active=False
    )

    db.add(user)
    db.flush()

    employee = Employee(
        employee_code=f"EMP{user.id:04d}",
        user_id=user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        department=data.department,
        designation=data.designation,
        employment_type=data.employment_type,
        joining_date=data.joining_date
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee