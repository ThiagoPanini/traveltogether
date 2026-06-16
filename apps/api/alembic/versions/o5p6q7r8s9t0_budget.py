"""lodgings + extras (boundary budget — ADR-0016, invariantes 15 e 19)

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-06-15

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from sqlalchemy import inspect

from alembic import op

revision: str = "o5p6q7r8s9t0"
down_revision: str | None = "n4o5p6q7r8s9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def upgrade() -> None:
    if not _table_exists("lodgings"):
        op.create_table(
            "lodgings",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("trip_id", sa.Uuid(), nullable=False),
            sa.Column("stop_id", sa.Uuid(), nullable=False),
            sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("nightly_value", sa.Numeric(), nullable=False),
            sa.Column("currency", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("basis", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("created_by", sa.Uuid(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["trip_id"], ["trips.id"]),
            sa.ForeignKeyConstraint(["stop_id"], ["stops.id"]),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_lodgings_trip_id", "lodgings", ["trip_id"])

    if not _table_exists("extras"):
        op.create_table(
            "extras",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("trip_id", sa.Uuid(), nullable=False),
            sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("value", sa.Numeric(), nullable=False),
            sa.Column("currency", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("basis", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("created_by", sa.Uuid(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["trip_id"], ["trips.id"]),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_extras_trip_id", "extras", ["trip_id"])


def downgrade() -> None:
    op.drop_index("ix_extras_trip_id", table_name="extras")
    op.drop_table("extras")
    op.drop_index("ix_lodgings_trip_id", table_name="lodgings")
    op.drop_table("lodgings")
