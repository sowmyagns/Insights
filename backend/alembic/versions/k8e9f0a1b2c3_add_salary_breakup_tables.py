"""Add tenant-scoped salary breakup tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "k8e9f0a1b2c3"
down_revision: Union[str, Sequence[str], None] = "j7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = inspect(op.get_bind()).get_table_names()
    if "salary_components" not in tables:
        op.create_table(
            "salary_components",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("category", sa.String(30), nullable=False),
            sa.Column("calc_type", sa.String(20), nullable=False),
            sa.Column("calc_value", sa.Float(), nullable=True, server_default="0"),
            sa.Column("is_active", sa.Integer(), nullable=True, server_default="1"),
            sa.Column("description", sa.String(255)),
        )
        op.create_index("ix_salary_components_tenant_id", "salary_components", ["tenant_id"])
    if "salary_breakups" not in tables:
        op.create_table(
            "salary_breakups",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
            sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id")),
            sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id")),
            sa.Column("ctc_annual", sa.Float(), nullable=True, server_default="0"),
            sa.Column("effective_from", sa.Date()),
            sa.Column("created_by", sa.String(100)),
            sa.Column("updated_by", sa.String(100)),
            sa.Column("data", sa.Text()),
            sa.Column("created_at", sa.Date()),
        )
        op.create_index("ix_salary_breakups_tenant_id", "salary_breakups", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_salary_breakups_tenant_id", table_name="salary_breakups")
    op.drop_table("salary_breakups")
    op.drop_index("ix_salary_components_tenant_id", table_name="salary_components")
    op.drop_table("salary_components")