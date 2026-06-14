"""tasks + task_assignees (boundary collaboration — ADR-0014, invariante 18)

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-06-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from sqlalchemy import inspect

from alembic import op

revision: str = "n4o5p6q7r8s9"
down_revision: str | None = "m3n4o5p6q7r8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def upgrade() -> None:
    if not _table_exists("tasks"):
        op.create_table(
            "tasks",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("trip_id", sa.Uuid(), nullable=False),
            sa.Column("title", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("due_date", sa.Date(), nullable=True),
            sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("anchor_type", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
            sa.Column("anchor_id", sa.Uuid(), nullable=True),
            sa.Column("created_by", sa.Uuid(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["trip_id"], ["trips.id"]),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_tasks_trip_id", "tasks", ["trip_id"])

    if not _table_exists("task_assignees"):
        op.create_table(
            "task_assignees",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("task_id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_task_assignees_task_id", "task_assignees", ["task_id"])
        op.create_index("ix_task_assignees_user_id", "task_assignees", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_task_assignees_user_id", table_name="task_assignees")
    op.drop_index("ix_task_assignees_task_id", table_name="task_assignees")
    op.drop_table("task_assignees")
    op.drop_index("ix_tasks_trip_id", table_name="tasks")
    op.drop_table("tasks")
