"""add account status for onboarding

Revision ID: 56a75f7f5ae2
Revises: a9a140cae5ac
Create Date: 2026-07-26 13:42:59.238164

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56a75f7f5ae2'
down_revision: Union[str, Sequence[str], None] = 'a9a140cae5ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    account_status = sa.Enum(
        "INVITED",
        "ACTIVE",
        "INACTIVE",
        name="account_status"
    )

    # Create PostgreSQL ENUM first
    account_status.create(op.get_bind(), checkfirst=True)

    # Existing users should become ACTIVE
    op.add_column(
        "users",
        sa.Column(
            "status",
            account_status,
            nullable=False,
            server_default="ACTIVE"
        )
    )

    # Password must be nullable for invited employees
    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.VARCHAR(length=255),
        nullable=True
    )

    # Default was only needed to migrate existing rows
    op.alter_column(
        "users",
        "status",
        server_default=None
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.VARCHAR(length=255),
        nullable=False
    )

    op.drop_column("users", "status")

    account_status = sa.Enum(
        "INVITED",
        "ACTIVE",
        "INACTIVE",
        name="account_status"
    )

    account_status.drop(op.get_bind(), checkfirst=True)
