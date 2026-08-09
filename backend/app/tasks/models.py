import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaskReminderKind(str, enum.Enum):
    DUE_IN_7_DAYS = "DUE_IN_7_DAYS"
    DUE_IN_3_DAYS = "DUE_IN_3_DAYS"
    DUE_TODAY = "DUE_TODAY"
    OVERDUE = "OVERDUE"


class EmployeeTask(Base):
    __tablename__ = "employee_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    assigned_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority, name="task_priority"), default=TaskPriority.MEDIUM, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus, name="task_status"), default=TaskStatus.PENDING, nullable=False, index=True)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee = relationship("Employee")
    assigner = relationship("User", foreign_keys=[assigned_by])


class TaskReminder(Base):
    __tablename__ = "task_reminders"
    __table_args__ = (UniqueConstraint("task_id", "kind", name="uq_task_reminder_kind"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("employee_tasks.id"), nullable=False, index=True)
    kind: Mapped[TaskReminderKind] = mapped_column(Enum(TaskReminderKind, name="task_reminder_kind"), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    task = relationship("EmployeeTask")
