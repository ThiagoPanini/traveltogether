"""stop cover image

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-06-10

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "i9j0k1l2m3n4"
down_revision: str | None = "h8i9j0k1l2m3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("stops", sa.Column("cover_image_key", sa.String(), nullable=True))
    op.add_column("stops", sa.Column("cover_image_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("stops", "cover_image_url")
    op.drop_column("stops", "cover_image_key")
