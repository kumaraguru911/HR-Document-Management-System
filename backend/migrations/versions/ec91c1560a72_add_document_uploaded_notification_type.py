"""add document uploaded notification type

Revision ID: ec91c1560a72
Revises: ce910a201261
Create Date: 2026-07-30 18:30:28.829287

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec91c1560a72'
down_revision: Union[str, Sequence[str], None] = 'ce910a201261'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        "ALTER TYPE notification_type "
        "ADD VALUE IF NOT EXISTS 'DOCUMENT_UPLOADED'"
    )



def downgrade() -> None:
    """Downgrade schema."""
    pass
