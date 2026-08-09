"""add document expiry tracking

Revision ID: b7e4a92d1c30
Revises: ec91c1560a72
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7e4a92d1c30"
down_revision: Union[str, Sequence[str], None] = "ec91c1560a72"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "document_types",
        sa.Column("tracks_expiry", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("documents", sa.Column("expiry_date", sa.Date(), nullable=True))
    op.create_index("ix_documents_expiry_date", "documents", ["expiry_date"], unique=False)
    op.alter_column("document_types", "tracks_expiry", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_documents_expiry_date", table_name="documents")
    op.drop_column("documents", "expiry_date")
    op.drop_column("document_types", "tracks_expiry")
