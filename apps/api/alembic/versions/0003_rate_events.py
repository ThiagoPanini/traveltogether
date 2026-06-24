"""rate_events (rate-limit DB-backed do endurecimento, #194)

Tabela append-only de eventos de uso para rate-limit em janelas, sem Redis no stack
(ADR-0004). A contagem por `(scope, key)` numa janela decide o bloqueio do pedido de
OTP (cooldown + tetos por e-mail/IP/global). `occurred_at` é o instante lógico do
evento (sem timezone: gravado em UTC naive para contagem uniforme).

Revision ID: 0003_rate_events
Revises: 0002_identidade
Create Date: 2026-06-24

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_rate_events"
down_revision: str | None = "0002_identidade"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rate_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("scope", sa.String(length=40), nullable=False),
        sa.Column("key", sa.String(length=320), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_rate_events_scope_key_time",
        "rate_events",
        ["scope", "key", "occurred_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_rate_events_scope_key_time", table_name="rate_events")
    op.drop_table("rate_events")
