"""Add address column to employees.

Revision ID: 3f2f0a911b11
Revises: de8b5e165733
Create Date: 2026-08-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "3f2f0a911b11"
down_revision = "de8b5e165733"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Legacy HR table — skip when active schema excludes employees (PostgreSQL cutover).
    bind = op.get_bind()
    inspector = inspect(bind)
    if "employees" not in inspector.get_table_names():
        return
    existing_cols = {col["name"] for col in inspector.get_columns("employees")}
    if "address" not in existing_cols:
        op.add_column("employees", sa.Column("address", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "employees" not in inspector.get_table_names():
        return
    existing_cols = {col["name"] for col in inspector.get_columns("employees")}
    if "address" in existing_cols:
        op.drop_column("employees", "address")
