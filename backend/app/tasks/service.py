from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.employees.models import Employee
from app.notifications.models import NotificationType
from app.notifications.service import create_notification
from app.tasks.models import EmployeeTask, TaskReminder, TaskReminderKind, TaskStatus
from app.tasks.schemas import TaskCreate


def _serialize(task: EmployeeTask) -> dict:
    return {
        "id": task.id,
        "employee_id": task.employee_id,
        "employee_name": f"{task.employee.first_name} {task.employee.last_name}" if task.employee else None,
        "title": task.title,
        "description": task.description,
        "due_date": task.due_date,
        "priority": task.priority,
        "status": task.status,
        "action_url": task.action_url,
        "completed_at": task.completed_at,
        "created_at": task.created_at,
        "days_until_due": (task.due_date - date.today()).days if task.due_date else None,
    }


def create_task(db: Session, data: TaskCreate, assigned_by: int):
    employee = db.get(Employee, data.employee_id)
    if employee is None:
        return None

    task = EmployeeTask(**data.model_dump(), assigned_by=assigned_by)
    db.add(task)
    db.flush()
    create_notification(
        db=db,
        user_id=employee.user_id,
        notification_type=NotificationType.TASK_ASSIGNED,
        title="New onboarding task assigned",
        message=f"{task.title}{f' — due {task.due_date.isoformat()}' if task.due_date else ''}",
    )
    db.commit()
    db.refresh(task)
    return _serialize(task)


def get_tasks_for_hr(db: Session, employee_id: int | None = None):
    statement = select(EmployeeTask).options(selectinload(EmployeeTask.employee)).order_by(EmployeeTask.status.asc(), EmployeeTask.due_date.asc())
    if employee_id is not None:
        statement = statement.where(EmployeeTask.employee_id == employee_id)
    return [_serialize(task) for task in db.scalars(statement).all()]


def get_my_tasks(db: Session, user_id: int):
    employee = db.scalar(select(Employee).where(Employee.user_id == user_id))
    if employee is None:
        return None
    tasks = db.scalars(
        select(EmployeeTask)
        .options(selectinload(EmployeeTask.employee))
        .where(EmployeeTask.employee_id == employee.id, EmployeeTask.status == TaskStatus.PENDING)
        .order_by(EmployeeTask.due_date.asc(), EmployeeTask.created_at.desc())
    ).all()
    return [_serialize(task) for task in tasks]


def complete_task(db: Session, task_id: int, user_id: int):
    employee = db.scalar(select(Employee).where(Employee.user_id == user_id))
    if employee is None:
        return None
    task = db.scalar(
        select(EmployeeTask)
        .options(selectinload(EmployeeTask.employee))
        .where(EmployeeTask.id == task_id, EmployeeTask.employee_id == employee.id)
    )
    if task is None:
        return None
    if task.status != TaskStatus.PENDING:
        return False
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return _serialize(task)


def run_due_reminders(db: Session) -> dict:
    """Create each milestone reminder once; safe to invoke every day."""
    today = date.today()
    tasks = db.scalars(
        select(EmployeeTask)
        .options(selectinload(EmployeeTask.employee), selectinload(EmployeeTask.assigner))
        .where(EmployeeTask.status == TaskStatus.PENDING, EmployeeTask.due_date.is_not(None))
    ).all()
    sent = 0
    milestones = {7: TaskReminderKind.DUE_IN_7_DAYS, 3: TaskReminderKind.DUE_IN_3_DAYS, 0: TaskReminderKind.DUE_TODAY}

    for task in tasks:
        days_until_due = (task.due_date - today).days
        kind = milestones.get(days_until_due, TaskReminderKind.OVERDUE if days_until_due < 0 else None)
        if kind is None:
            continue
        already_sent = db.scalar(select(TaskReminder.id).where(TaskReminder.task_id == task.id, TaskReminder.kind == kind))
        if already_sent:
            continue
        if kind == TaskReminderKind.OVERDUE:
            title = "Task overdue"
            message = f"{task.title} was due on {task.due_date.isoformat()}. Please complete it or contact HR."
            notification_type = NotificationType.TASK_OVERDUE
        else:
            day_label = "today" if days_until_due == 0 else f"in {days_until_due} days"
            title = "Task due reminder"
            message = f"{task.title} is due {day_label} ({task.due_date.isoformat()})."
            notification_type = NotificationType.TASK_DUE_REMINDER
        create_notification(db, task.employee.user_id, notification_type, title, message)
        if kind == TaskReminderKind.OVERDUE:
            create_notification(db, task.assigned_by, notification_type, f"Employee task overdue: {task.employee.first_name} {task.employee.last_name}", message)
        db.add(TaskReminder(task_id=task.id, kind=kind))
        sent += 1
    db.commit()
    return {"reminders_sent": sent}
