"""Add meetings and Google Calendar integration tables.

Revision ID: a1b2c3d4e5f6
Revises: 3f2f0a911b11
Create Date: 2026-08-15 00:00:00.000000

These tables are included in the baseline revision (de8b5e165733) because it
runs ``Base.metadata.create_all`` against the full ORM metadata (including
``app.models.meeting``). This revision remains for databases that were created
before meetings models were registered on ``Base.metadata``.

On fresh PostgreSQL installs the baseline already creates:
  - meetings
  - meeting_participants
  - google_calendar_credentials

This upgrade is a no-op when all three tables already exist.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "a1b2c3d4e5f6"
down_revision = "3f2f0a911b11"
branch_labels = None
depends_on = None

_MEETING_TABLES = (
    "meetings",
    "meeting_participants",
    "google_calendar_credentials",
)


def _all_meeting_tables_present(bind) -> bool:
    existing = set(inspect(bind).get_table_names())
    return all(name in existing for name in _MEETING_TABLES)


def _any_meeting_table_present(bind) -> bool:
    existing = set(inspect(bind).get_table_names())
    return any(name in existing for name in _MEETING_TABLES)


def _create_meeting_tables() -> None:
    op.create_table(
        "meetings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("meeting_type", sa.String(length=64), nullable=True),
        sa.Column("meeting_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="Asia/Kolkata"),
        sa.Column("organizer", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("agenda", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("reminder_minutes", sa.Integer(), nullable=True),
        sa.Column("create_google_meet_requested", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="scheduled"),
        sa.Column("google_calendar_event_id", sa.String(length=255), nullable=True),
        sa.Column("google_calendar_event_url", sa.String(length=512), nullable=True),
        sa.Column("google_meet_url", sa.String(length=512), nullable=True),
        sa.Column("google_conference_id", sa.String(length=255), nullable=True),
        sa.Column("google_meet_status", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_meetings_tenant_id", "meetings", ["tenant_id"])

    op.create_table(
        "meeting_participants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("meeting_id", "email", name="uq_meeting_participant_email"),
    )

    op.create_table(
        "google_calendar_credentials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("google_account_email", sa.String(length=255), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "user_id", name="uq_google_calendar_user"),
    )
    op.create_index("ix_google_calendar_credentials_tenant_id", "google_calendar_credentials", ["tenant_id"])
    op.create_index("ix_google_calendar_credentials_user_id", "google_calendar_credentials", ["user_id"])


def upgrade() -> None:
    bind = op.get_bind()
    if _all_meeting_tables_present(bind):
        return
    if _any_meeting_table_present(bind):
        raise RuntimeError(
            "Partial meetings / Google Calendar schema detected "
            f"({', '.join(_MEETING_TABLES)}). Manual reconciliation required."
        )
    _create_meeting_tables()


def downgrade() -> None:
    # No-op: on fresh installs these tables are created by de8b5e165733
    # (Base.metadata.create_all). Dropping here would remove baseline-owned schema.
    pass
