"""Add tenant and audit fields to announcements."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "j7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = "h6c7d8e9f0a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if "announcements" not in inspect(bind).get_table_names():
        return
    columns = {column["name"] for column in inspect(bind).get_columns("announcements")}
    if "tenant_id" not in columns:
        op.add_column("announcements", sa.Column("tenant_id", sa.Integer(), nullable=True))
        op.create_index("ix_announcements_tenant_id", "announcements", ["tenant_id"])
    for name in ("created_by", "updated_by"):
        if name not in columns:
            op.add_column("announcements", sa.Column(name, sa.String(255), nullable=True))
    for name in ("updated_at",):
        if name not in columns:
            op.add_column("announcements", sa.Column(name, sa.Date(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    if "announcements" not in inspect(bind).get_table_names():
        return
    columns = {column["name"] for column in inspect(bind).get_columns("announcements")}
    for name in ("updated_at", "updated_by", "created_by"):
        if name in columns:
            op.drop_column("announcements", name)
    if "tenant_id" in columns:
        op.drop_index("ix_announcements_tenant_id", table_name="announcements")
        op.drop_column("announcements", "tenant_id")