"""add employee tasks

Revision ID: c6f1a58be413
Revises: b7e4a92d1c30
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c6f1a58be413"
down_revision: Union[str, Sequence[str], None] = "b7e4a92d1c30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'TASK_ASSIGNED'")
    op.create_table(
        "employee_tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("assigned_by", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("priority", sa.Enum("LOW", "MEDIUM", "HIGH", name="task_priority"), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "COMPLETED", "CANCELLED", name="task_status"), nullable=False),
        sa.Column("action_url", sa.String(length=500), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_employee_tasks_employee_id", "employee_tasks", ["employee_id"], unique=False)
    op.create_index("ix_employee_tasks_due_date", "employee_tasks", ["due_date"], unique=False)
    op.create_index("ix_employee_tasks_status", "employee_tasks", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_employee_tasks_status", table_name="employee_tasks")
    op.drop_index("ix_employee_tasks_due_date", table_name="employee_tasks")
    op.drop_index("ix_employee_tasks_employee_id", table_name="employee_tasks")
    op.drop_table("employee_tasks")
