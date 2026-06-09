"""pending memberships

Revision ID: 7039512b819d
Revises: 4d3bbcfac085
Create Date: 2026-06-09

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "7039512b819d"
down_revision: str | None = "4d3bbcfac085"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pending_memberships",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("trip_id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column(
            "role",
            sa.Enum("organizer", "member", name="membershiprole"),
            nullable=False,
        ),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pending_memberships_email"), "pending_memberships", ["email"])


def downgrade() -> None:
    op.drop_index(op.f("ix_pending_memberships_email"), table_name="pending_memberships")
    op.drop_table("pending_memberships")
