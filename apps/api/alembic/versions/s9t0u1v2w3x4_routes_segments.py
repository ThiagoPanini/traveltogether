"""routes, segments and fare_quote_segments (ADR-0018/0019 skeleton)

Reancora a `Pesquisa de Passagem` no `Trecho` (Segment) via tabela de ligação
`fare_quote_segments`, introduzindo o modelo de 4 níveis. Migração **aditiva**:
cada `Trajeto` (Leg) ganha uma `Rota` "direta" com um `Trecho` aéreo, cada
`FareQuote` existente reancora nesse `Trecho`, e a coluna `fare_quotes.leg_id`
é removida.

Revision ID: s9t0u1v2w3x4
Revises: r8s9t0u1v2w3
Create Date: 2026-06-16

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

revision: str = "s9t0u1v2w3x4"
down_revision: str | None = "r8s9t0u1v2w3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    return inspect(op.get_bind()).has_table(table_name)


def _columns(table_name: str) -> list[str]:
    return [c["name"] for c in inspect(op.get_bind()).get_columns(table_name)]


def upgrade() -> None:
    if not _table_exists("routes"):
        op.create_table(
            "routes",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("leg_id", sa.UUID(), nullable=False),
            sa.Column("label", sa.String(), nullable=False, server_default=""),
            sa.Column("order", sa.Integer(), nullable=False),
            sa.Column("created_by", sa.UUID(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["leg_id"], ["legs.id"]),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _table_exists("segments"):
        op.create_table(
            "segments",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("route_id", sa.UUID(), nullable=False),
            sa.Column("mode", sa.String(), nullable=False, server_default="air"),
            sa.Column("origin_airport", sa.String(), nullable=True),
            sa.Column("destination_airport", sa.String(), nullable=True),
            sa.Column("order", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["route_id"], ["routes.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _table_exists("fare_quote_segments"):
        op.create_table(
            "fare_quote_segments",
            sa.Column("fare_quote_id", sa.UUID(), nullable=False),
            sa.Column("segment_id", sa.UUID(), nullable=False),
            sa.ForeignKeyConstraint(["fare_quote_id"], ["fare_quotes.id"]),
            sa.ForeignKeyConstraint(["segment_id"], ["segments.id"]),
            sa.PrimaryKeyConstraint("fare_quote_id", "segment_id"),
        )

    # ── backfill: 1 Rota "direta" + 1 Trecho aéreo por Trajeto, reancora fares ──
    if not _table_exists("fare_quotes") or "leg_id" not in _columns("fare_quotes"):
        return

    bind = op.get_bind()
    trips = {
        row.id: row
        for row in bind.execute(sa.text("SELECT id, created_by, airport_code FROM trips"))
    }
    stops = {
        row.id: row.airport_code
        for row in bind.execute(sa.text("SELECT id, airport_code FROM stops"))
    }
    legs = list(
        bind.execute(sa.text("SELECT id, trip_id, origin_stop_id, destination_stop_id FROM legs"))
    )

    now = datetime.now(UTC)
    leg_to_segment: dict[uuid.UUID, uuid.UUID] = {}
    for leg in legs:
        trip = trips.get(leg.trip_id)
        if trip is None:
            continue
        route_id = uuid.uuid4()
        segment_id = uuid.uuid4()
        origin_airport = (
            stops.get(leg.origin_stop_id) if leg.origin_stop_id is not None else trip.airport_code
        )
        destination_airport = (
            stops.get(leg.destination_stop_id) if leg.destination_stop_id is not None else None
        )
        bind.execute(
            sa.text(
                'INSERT INTO routes (id, leg_id, label, "order", created_by, created_at) '
                "VALUES (:id, :leg_id, :label, 1, :created_by, :created_at)"
            ),
            {
                "id": route_id,
                "leg_id": leg.id,
                "label": "Direto",
                "created_by": trip.created_by,
                "created_at": now,
            },
        )
        bind.execute(
            sa.text(
                "INSERT INTO segments "
                '(id, route_id, mode, origin_airport, destination_airport, "order") '
                "VALUES (:id, :route_id, 'air', :origin, :destination, 1)"
            ),
            {
                "id": segment_id,
                "route_id": route_id,
                "origin": origin_airport,
                "destination": destination_airport,
            },
        )
        leg_to_segment[leg.id] = segment_id

    for fare in bind.execute(sa.text("SELECT id, leg_id FROM fare_quotes")):
        segment_id = leg_to_segment.get(fare.leg_id)
        if segment_id is None:
            continue
        bind.execute(
            sa.text(
                "INSERT INTO fare_quote_segments (fare_quote_id, segment_id) "
                "VALUES (:fare_id, :segment_id)"
            ),
            {"fare_id": fare.id, "segment_id": segment_id},
        )

    op.drop_column("fare_quotes", "leg_id")


def downgrade() -> None:
    if _table_exists("fare_quotes") and "leg_id" not in _columns("fare_quotes"):
        op.add_column("fare_quotes", sa.Column("leg_id", sa.UUID(), nullable=True))
    if _table_exists("fare_quote_segments"):
        op.drop_table("fare_quote_segments")
    if _table_exists("segments"):
        op.drop_table("segments")
    if _table_exists("routes"):
        op.drop_table("routes")
