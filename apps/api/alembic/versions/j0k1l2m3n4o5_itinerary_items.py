"""itinerary items

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-06-10

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "j0k1l2m3n4o5"
down_revision: str | None = "i9j0k1l2m3n4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "itinerary_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("stop_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("notes", sa.String(), nullable=False, server_default=""),
        sa.Column("link", sa.String(), nullable=False, server_default=""),
        sa.Column("day", sa.Date(), nullable=True),
        sa.Column("time", sa.String(), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["stop_id"], ["stops.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_itinerary_items_stop_id"), "itinerary_items", ["stop_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_itinerary_items_stop_id"), table_name="itinerary_items")
    op.drop_table("itinerary_items")
