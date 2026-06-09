"""fare quotes

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-09

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "fare_quotes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("leg_id", sa.UUID(), nullable=False),
        sa.Column("registered_by", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(), nullable=False),
        sa.Column("flight_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("stops", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("checked_baggage", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("origin_airport", sa.String(), nullable=False),
        sa.Column("destination_airport", sa.String(), nullable=False),
        sa.Column("airline", sa.String(), nullable=False),
        sa.Column("link", sa.String(), nullable=False, server_default=""),
        sa.Column("notes", sa.String(), nullable=False, server_default=""),
        sa.ForeignKeyConstraint(["leg_id"], ["legs.id"]),
        sa.ForeignKeyConstraint(["registered_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("fare_quotes")
