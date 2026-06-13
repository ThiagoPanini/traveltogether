"""trip + stop coordinates (latitude/longitude)

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-06-13

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision: str = "l2m3n4o5p6q7"
down_revision: str | None = "k1l2m3n4o5p6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(table_name: str, column_name: str) -> bool:
    columns = inspect(op.get_bind()).get_columns(table_name)
    return any(column["name"] == column_name for column in columns)


def upgrade() -> None:
    for table in ("trips", "stops"):
        if not _column_exists(table, "latitude"):
            op.add_column(table, sa.Column("latitude", sa.Float(), nullable=True))
        if not _column_exists(table, "longitude"):
            op.add_column(table, sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    for table in ("stops", "trips"):
        op.drop_column(table, "longitude")
        op.drop_column(table, "latitude")
