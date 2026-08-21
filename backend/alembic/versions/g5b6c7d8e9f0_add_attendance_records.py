"""Create the active attendance records table for existing databases."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "g5b6c7d8e9f0"
down_revision: Union[str, Sequence[str], None] = "f4a5b6c7d8e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "attendance_records" in inspector.get_table_names():
        return

    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("clock_in", sa.DateTime()),
        sa.Column("clock_out", sa.DateTime()),
        sa.Column("status", sa.String(32)),
        sa.Column("work_hours", sa.Float()),
        sa.Column("overtime_hours", sa.Float()),
        sa.Column("break_minutes", sa.Float(), nullable=False, server_default="0"),
        sa.Column("capacity_hours", sa.Float(), nullable=False, server_default="8"),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_attendance_records_tenant_id", "attendance_records", ["tenant_id"])
    op.create_index("ix_attendance_records_employee_id", "attendance_records", ["employee_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if "attendance_records" in inspect(bind).get_table_names():
        op.drop_table("attendance_records")
