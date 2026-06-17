"""preço em pontos na Pesquisa (programa de fidelidade) — ADR-0019

Adiciona o par opcional de pontos em `fare_quotes`: `points` (quantidade) e
`loyalty_program` (rótulo livre da unidade, ex.: "milhas LATAM"), ao lado do par
de dinheiro `value`/`currency`. Estende a invariante 15: nada se converte entre
dinheiro e pontos; arranjos só-dinheiro, só-pontos ou pontos + taxa. Aditiva e
idempotente (guardas `_columns`).

Revision ID: u1v2w3x4y5z6
Revises: t0u1v2w3x4y5
Create Date: 2026-06-16

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision: str = "u1v2w3x4y5z6"
down_revision: str | None = "t0u1v2w3x4y5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _columns(table_name: str) -> list[str]:
    if not _table_exists(table_name):
        return []
    return [c["name"] for c in inspect(op.get_bind()).get_columns(table_name)]


def upgrade() -> None:
    cols = _columns("fare_quotes")
    if "points" not in cols and _table_exists("fare_quotes"):
        op.add_column("fare_quotes", sa.Column("points", sa.Integer(), nullable=True))
    if "loyalty_program" not in cols and _table_exists("fare_quotes"):
        op.add_column("fare_quotes", sa.Column("loyalty_program", sa.String(), nullable=True))


def downgrade() -> None:
    cols = _columns("fare_quotes")
    if "loyalty_program" in cols:
        op.drop_column("fare_quotes", "loyalty_program")
    if "points" in cols:
        op.drop_column("fare_quotes", "points")
