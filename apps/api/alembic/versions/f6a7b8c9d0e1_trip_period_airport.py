"""trip: periodo e aeroporto de referencia

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-10

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: str | None = "e5f6a7b8c9d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("trips", sa.Column("airport_code", sa.String(), nullable=True))
    op.add_column("trips", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("trips", sa.Column("end_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("trips", "end_date")
    op.drop_column("trips", "start_date")
    op.drop_column("trips", "airport_code")
