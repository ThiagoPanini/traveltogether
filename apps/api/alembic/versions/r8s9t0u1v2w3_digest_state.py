"""digest_state — marca d'água do digest por destinatário (boundary notifications — #112)

Revision ID: r8s9t0u1v2w3
Revises: q7r8s9t0u1v2
Create Date: 2026-06-16

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision: str = "r8s9t0u1v2w3"
down_revision: str | None = "q7r8s9t0u1v2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def upgrade() -> None:
    if not _table_exists("digest_state"):
        op.create_table(
            "digest_state",
            sa.Column("recipient_id", sa.Uuid(), nullable=False),
            sa.Column("last_sent_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["recipient_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("recipient_id"),
        )


def downgrade() -> None:
    op.drop_table("digest_state")
