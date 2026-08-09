"""add task reminders

Revision ID: e4c7d3b19f62
Revises: d2f8c45a907e
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e4c7d3b19f62"
down_revision: Union[str, Sequence[str], None] = "d2f8c45a907e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE task_reminder_kind AS ENUM ('DUE_IN_7_DAYS', 'DUE_IN_3_DAYS', 'DUE_TODAY', 'OVERDUE')")
    reminder_kind = postgresql.ENUM(
        "DUE_IN_7_DAYS", "DUE_IN_3_DAYS", "DUE_TODAY", "OVERDUE",
        name="task_reminder_kind",
        create_type=False,
    )
    op.create_table(
        "task_reminders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("kind", reminder_kind, nullable=False, server_default=None),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["employee_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "kind", name="uq_task_reminder_kind"),
    )
    op.create_index("ix_task_reminders_task_id", "task_reminders", ["task_id"], unique=False)
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'TASK_DUE_REMINDER'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'TASK_OVERDUE'")


def downgrade() -> None:
    op.drop_index("ix_task_reminders_task_id", table_name="task_reminders")
    op.drop_table("task_reminders")
    op.execute("DROP TYPE task_reminder_kind")
