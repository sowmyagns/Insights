"""Add tenant-scoped statutory settings."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "l9f0a1b2c3d4"
down_revision: Union[str, Sequence[str], None] = "k8e9f0a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()
    if "statutory_settings" not in tables:
        op.create_table(
            "statutory_settings",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
            sa.Column("setting_type", sa.String(30), nullable=False),
            sa.Column("data", sa.Text()),
            sa.Column("is_active", sa.Integer(), nullable=True, server_default="1"),
        )
        op.create_index("ix_statutory_settings_tenant_id", "statutory_settings", ["tenant_id"])
        op.create_index("ix_statutory_settings_id", "statutory_settings", ["id"])
        return

    columns = {column["name"] for column in inspector.get_columns("statutory_settings")}
    if "tenant_id" not in columns:
        # Legacy local databases may already contain statutory rows without a
        # tenant. Keep those rows readable while new writes are tenant-scoped.
        op.add_column(
            "statutory_settings",
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=True),
        )
    existing_indexes = {index["name"] for index in inspector.get_indexes("statutory_settings")}
    if "ix_statutory_settings_tenant_id" not in existing_indexes:
        op.create_index("ix_statutory_settings_tenant_id", "statutory_settings", ["tenant_id"])
    if "ix_statutory_settings_id" not in existing_indexes:
        op.create_index("ix_statutory_settings_id", "statutory_settings", ["id"])


def downgrade() -> None:
    op.drop_index("ix_statutory_settings_id", table_name="statutory_settings")
    op.drop_index("ix_statutory_settings_tenant_id", table_name="statutory_settings")
    op.drop_table("statutory_settings")