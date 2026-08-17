"""Phase 1 schema consolidation checkpoint.

Revision ID: c4d5e6f7a8b9
Revises: a1b2c3d4e5f6
Create Date: 2026-08-17 00:00:00.000000

All active-schema columns, constraints, and indexes are defined in SQLAlchemy
models under ``app/models/``. The baseline revision (de8b5e165733) creates the
full active schema via ``Base.metadata.create_all``.

This revision replaces runtime DDL that previously ran in ``app/main.py`` on
startup. Fresh databases (SQLite or PostgreSQL) should use::

    alembic upgrade head

Legacy HR archive tables (employees, attendance_records, etc.) are out of
scope for the active schema and are not created by current models.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Schema is model-driven; no incremental DDL required for Phase 1."""
    pass


def downgrade() -> None:
    """No-op checkpoint revision."""
    pass
