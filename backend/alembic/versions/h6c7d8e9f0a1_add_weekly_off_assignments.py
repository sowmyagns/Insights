"""Add persistent weekly-off assignments."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "h6c7d8e9f0a1"
down_revision: Union[str, Sequence[str], None] = "g5b6c7d8e9f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if "weekly_off_assignments" in inspect(bind).get_table_names():
        return

    op.create_table(
        "weekly_off_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("weekly_off_id", sa.Integer(), sa.ForeignKey("weekly_offs.id"), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("branch", sa.String(128)),
        sa.Column("department", sa.String(128)),
        sa.Column("work_week", sa.String(128)),
        sa.Column("week_off", sa.String(128), nullable=False),
        sa.Column("created_by", sa.String(255)),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_weekly_off_assignments_tenant_id", "weekly_off_assignments", ["tenant_id"])
    op.create_index("ix_weekly_off_assignments_employee_id", "weekly_off_assignments", ["employee_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if "weekly_off_assignments" in inspect(bind).get_table_names():
        op.drop_table("weekly_off_assignments")
