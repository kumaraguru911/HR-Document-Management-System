from datetime import date, datetime

from pydantic import BaseModel, Field, HttpUrl

from app.tasks.models import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    employee_id: int
    title: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    due_date: date | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    action_url: str | None = Field(default=None, max_length=500)


class EmployeeTaskResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str | None = None
    title: str
    description: str | None
    due_date: date | None
    priority: TaskPriority
    status: TaskStatus
    action_url: str | None
    completed_at: datetime | None
    created_at: datetime
    days_until_due: int | None = None

    model_config = {"from_attributes": True}
