from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_employee, require_hr
from app.auth.models import User
from app.database.session import get_db
from app.tasks.schemas import EmployeeTaskResponse, TaskCreate
from app.tasks.service import complete_task, create_task, get_my_tasks, get_tasks_for_hr, run_due_reminders

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", response_model=EmployeeTaskResponse, status_code=status.HTTP_201_CREATED)
def assign_task(data: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(require_hr)):
    task = create_task(db, data, current_user.id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return task


@router.get("", response_model=list[EmployeeTaskResponse])
def list_tasks(employee_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(require_hr)):
    return get_tasks_for_hr(db, employee_id)


@router.get("/my", response_model=list[EmployeeTaskResponse])
def my_tasks(db: Session = Depends(get_db), current_user: User = Depends(require_employee)):
    tasks = get_my_tasks(db, current_user.id)
    if tasks is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee profile not found")
    return tasks


@router.post("/reminders/run")
def send_due_reminders(db: Session = Depends(get_db), current_user: User = Depends(require_hr)):
    return run_due_reminders(db)


@router.patch("/{task_id}/complete", response_model=EmployeeTaskResponse)
def complete_my_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_employee)):
    task = complete_task(db, task_id, current_user.id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task is already closed")
    return task
