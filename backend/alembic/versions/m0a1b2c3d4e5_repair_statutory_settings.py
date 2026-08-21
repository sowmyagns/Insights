"""Repair legacy statutory settings tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "m0a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "l9f0a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "statutory_settings" not in inspector.get_table_names():
        op.create_table(
            "statutory_settings",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=True),
            sa.Column("setting_type", sa.String(30), nullable=False),
            sa.Column("data", sa.Text()),
            sa.Column("is_active", sa.Integer(), nullable=True, server_default="1"),
        )
    columns = {column["name"] for column in inspect(bind).get_columns("statutory_settings")}
    if "tenant_id" not in columns:
        op.add_column(
            "statutory_settings",
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=True),
        )
    indexes = {index["name"] for index in inspect(bind).get_indexes("statutory_settings")}
    if "ix_statutory_settings_tenant_id" not in indexes:
        op.create_index("ix_statutory_settings_tenant_id", "statutory_settings", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_statutory_settings_tenant_id", table_name="statutory_settings")
