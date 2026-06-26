"""criação de viagem da Fase 3 (trips, stops, memberships, invitations)

As 4 tabelas do esqueleto de uma Viagem, criadas juntas numa migração (ADR-0011):
`trips`, `stops`, `memberships` (Participação) e `invitations` (Convite). A FK
cross-contexto `memberships.user_id → users.id` (e `trips.created_by`,
`invitations.invited_by`) é one-directional — depende do `0002_identidade`. O índice
parcial `uq_invitation_trip_email_pending` vigia só os Convites `pending` (revogar
libera o e-mail pro re-convite — ADR-0002).

Revision ID: 0004_trips
Revises: 0003_rate_events
Create Date: 2026-06-26

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_trips"
down_revision: str | None = "0003_rate_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamp(name: str) -> sa.Column:
    """Coluna de timestamp UTC com default no banco (instância nova por chamada)."""
    return sa.Column(
        name,
        sa.DateTime(timezone=True),
        server_default=sa.text("now()"),
        nullable=False,
    )


def upgrade() -> None:
    op.create_table(
        "trips",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=280), nullable=True),
        sa.Column("departure_date", sa.Date(), nullable=True),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trips_created_by"), "trips", ["created_by"], unique=False)

    op.create_table(
        "stops",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("trip_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=True),
        sa.Column("arrival_date", sa.Date(), nullable=True),
        sa.Column("desired_transfer", sa.String(length=40), nullable=True),
        sa.Column("desired_transfer_other", sa.String(length=120), nullable=True),
        _timestamp("created_at"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("trip_id", "position", name="uq_stop_trip_position"),
    )
    op.create_index(op.f("ix_stops_trip_id"), "stops", ["trip_id"], unique=False)

    op.create_table(
        "memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("trip_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("entry_transfer", sa.String(length=40), nullable=True),
        sa.Column("entry_transfer_other", sa.String(length=120), nullable=True),
        _timestamp("created_at"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("trip_id", "user_id", name="uq_membership_trip_user"),
    )
    op.create_index(op.f("ix_memberships_trip_id"), "memberships", ["trip_id"], unique=False)
    op.create_index(op.f("ix_memberships_user_id"), "memberships", ["user_id"], unique=False)

    op.create_table(
        "invitations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("trip_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("invited_by", sa.Uuid(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("membership_id", sa.Uuid(), nullable=True),
        _timestamp("created_at"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["membership_id"], ["memberships.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invitations_trip_id"), "invitations", ["trip_id"], unique=False)
    op.create_index(op.f("ix_invitations_email"), "invitations", ["email"], unique=False)
    # Índice parcial: só um Convite vivo (pending) por (trip, email); revogar/recusar
    # libera o e-mail para um novo convite sem apagar histórico (ADR-0002 / ADR-0011).
    op.create_index(
        "uq_invitation_trip_email_pending",
        "invitations",
        ["trip_id", "email"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index("uq_invitation_trip_email_pending", table_name="invitations")
    op.drop_index(op.f("ix_invitations_email"), table_name="invitations")
    op.drop_index(op.f("ix_invitations_trip_id"), table_name="invitations")
    op.drop_table("invitations")
    op.drop_index(op.f("ix_memberships_user_id"), table_name="memberships")
    op.drop_index(op.f("ix_memberships_trip_id"), table_name="memberships")
    op.drop_table("memberships")
    op.drop_index(op.f("ix_stops_trip_id"), table_name="stops")
    op.drop_table("stops")
    op.drop_index(op.f("ix_trips_created_by"), table_name="trips")
    op.drop_table("trips")
