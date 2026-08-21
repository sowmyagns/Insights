"""Add tenant-scoped attendance correction and overtime workflows."""

from alembic import op
import sqlalchemy as sa

revision = "f4a5b6c7d8e9"
down_revision = "c4d5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "attendance_correction_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("old_check_in", sa.String(32)),
        sa.Column("new_check_in", sa.String(32)),
        sa.Column("old_check_out", sa.String(32)),
        sa.Column("new_check_out", sa.String(32)),
        sa.Column("old_status", sa.String(32)),
        sa.Column("new_status", sa.String(32)),
        sa.Column("old_hours", sa.String(32)),
        sa.Column("new_hours", sa.String(32)),
        sa.Column("reason", sa.Text()),
        sa.Column("created_by", sa.String(255)),
        sa.Column("approval_status", sa.String(32), nullable=False, server_default="Pending"),
        sa.Column("approved_by", sa.String(255)),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_attendance_correction_requests_tenant_id", "attendance_correction_requests", ["tenant_id"])
    op.create_index("ix_attendance_correction_requests_employee_id", "attendance_correction_requests", ["employee_id"])
    op.create_index("ix_attendance_correction_requests_approval_status", "attendance_correction_requests", ["approval_status"])
    op.create_table(
        "hr_overtime_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("request_date", sa.Date(), nullable=False),
        sa.Column("hours", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_by", sa.String(255)),
        sa.Column("approved_by", sa.String(255)),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_hr_overtime_requests_tenant_id", "hr_overtime_requests", ["tenant_id"])
    op.create_index("ix_hr_overtime_requests_employee_id", "hr_overtime_requests", ["employee_id"])
    op.create_index("ix_hr_overtime_requests_request_date", "hr_overtime_requests", ["request_date"])
    op.create_index("ix_hr_overtime_requests_status", "hr_overtime_requests", ["status"])


def downgrade() -> None:
    op.drop_table("hr_overtime_requests")
    op.drop_table("attendance_correction_requests")