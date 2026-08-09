"""add employee document vault

Revision ID: d2f8c45a907e
Revises: c6f1a58be413
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2f8c45a907e"
down_revision: Union[str, Sequence[str], None] = "c6f1a58be413"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    document_category = sa.Enum("ONBOARDING", "PAYSLIP", "TAX", "LETTER", "POLICY", "OTHER", name="document_category")
    document_category.create(op.get_bind(), checkfirst=True)
    op.add_column("document_types", sa.Column("category", document_category, nullable=False, server_default="ONBOARDING"))
    op.alter_column("document_types", "category", server_default=None)
    op.add_column("documents", sa.Column("uploaded_by", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_documents_uploaded_by_users", "documents", "users", ["uploaded_by"], ["id"])
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'VAULT_DOCUMENT_PUBLISHED'")


def downgrade() -> None:
    op.drop_constraint("fk_documents_uploaded_by_users", "documents", type_="foreignkey")
    op.drop_column("documents", "uploaded_by")
    op.drop_column("document_types", "category")
    sa.Enum(name="document_category").drop(op.get_bind(), checkfirst=True)
