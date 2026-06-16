"""notifications + notification_prefs (boundary notifications — ADR-0017, invariante 20)

Revision ID: q7r8s9t0u1v2
Revises: p6q7r8s9t0u1
Create Date: 2026-06-15

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from sqlalchemy import inspect

from alembic import op

revision: str = "q7r8s9t0u1v2"
down_revision: str | None = "p6q7r8s9t0u1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def upgrade() -> None:
    if not _table_exists("notifications"):
        op.create_table(
            "notifications",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("recipient_id", sa.Uuid(), nullable=False),
            sa.Column("kind", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("trip_id", sa.Uuid(), nullable=False),
            sa.Column("target_type", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
            sa.Column("target_id", sa.Uuid(), nullable=True),
            sa.Column("text", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("read_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["recipient_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["trip_id"], ["trips.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_notifications_recipient_id", "notifications", ["recipient_id"])

    if not _table_exists("notification_prefs"):
        op.create_table(
            "notification_prefs",
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("decision", sa.Boolean(), nullable=False),
            sa.Column("task", sa.Boolean(), nullable=False),
            sa.Column("mention", sa.Boolean(), nullable=False),
            sa.Column("digest", sa.Boolean(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("user_id"),
        )


def downgrade() -> None:
    op.drop_table("notification_prefs")
    op.drop_index("ix_notifications_recipient_id", table_name="notifications")
    op.drop_table("notifications")
