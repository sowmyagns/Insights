"""Add ack_no and ack_date to invoices.

Revision ID: 4a7c1b2d9e5f
Revises: 3f2f0a911b11
Create Date: 2026-08-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "4a7c1b2d9e5f"
down_revision = "3f2f0a911b11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("ack_no", sa.String(128), nullable=True))
    op.add_column("invoices", sa.Column("ack_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("invoices", "ack_no")
    op.drop_column("invoices", "ack_date")
