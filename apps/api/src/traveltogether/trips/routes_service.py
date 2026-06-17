"""Serviço de `Rota`s (routes) e `Trecho`s (segments) de um `Trajeto` (ADR-0018/0019).

Modelo de 4 níveis: `Trajeto` (Leg) → `Rota` (Route, autorada) → `Trecho`
(Segment, unidade de comparação) → `Pesquisa de Passagem` (ancora no Trecho).

Todo `Trajeto` nasce com uma `Rota` "direta" de um único `Trecho` aéreo
(esqueleto do #143); o construtor multi-Rota é o #144. Resolução para cima
(`Trecho` → `Rota` → `Trajeto` → `Viagem`) é interface explícita para outros
boundaries (fares/budget) sem importar modelos cross-boundary além do necessário.
"""

import uuid

from sqlmodel import Session, col, func, select

from traveltogether.trips.models import Leg, Route, Segment, SegmentMode, Stop, Trip

DEFAULT_ROUTE_LABEL = "Direto"


def _leg_airports(session: Session, leg: Leg) -> tuple[str | None, str | None]:
    """Aeroportos de origem/destino derivados das `Parada`s do `Trajeto`.

    Origem cai para o aeroporto da `Viagem` quando o `Trajeto` começa na Origem
    (sem `Parada` de origem). Qualquer um pode ser `None` no esqueleto.
    """
    origin_airport: str | None = None
    destination_airport: str | None = None
    if leg.origin_stop_id is not None:
        origin_stop = session.get(Stop, leg.origin_stop_id)
        origin_airport = origin_stop.airport_code if origin_stop else None
    else:
        trip = session.get(Trip, leg.trip_id)
        origin_airport = trip.airport_code if trip else None
    if leg.destination_stop_id is not None:
        dest_stop = session.get(Stop, leg.destination_stop_id)
        destination_airport = dest_stop.airport_code if dest_stop else None
    return origin_airport, destination_airport


def list_routes(session: Session, leg_id: uuid.UUID) -> list[Route]:
    return list(
        session.exec(select(Route).where(col(Route.leg_id) == leg_id).order_by(col(Route.order)))
    )


def list_segments(session: Session, route_id: uuid.UUID) -> list[Segment]:
    return list(
        session.exec(
            select(Segment).where(col(Segment.route_id) == route_id).order_by(col(Segment.order))
        )
    )


def ensure_default_route_and_segment(
    session: Session, leg: Leg, *, created_by: uuid.UUID, commit: bool = True
) -> Segment:
    """Garante a `Rota` "direta" do `Trajeto` com seu `Trecho` aéreo único.

    Idempotente: se o `Trajeto` já tem qualquer `Rota`, devolve o `Trecho` da
    primeira. Senão cria Rota+Trecho (aeroportos derivados das `Parada`s).
    """
    existing = list_routes(session, leg.id)
    if existing:
        segments = list_segments(session, existing[0].id)
        if segments:
            return segments[0]
        origin_airport, destination_airport = _leg_airports(session, leg)
        segment = Segment(
            route_id=existing[0].id,
            mode=SegmentMode.air,
            origin_airport=origin_airport,
            destination_airport=destination_airport,
            order=1,
        )
        session.add(segment)
    else:
        route = Route(leg_id=leg.id, label=DEFAULT_ROUTE_LABEL, order=1, created_by=created_by)
        session.add(route)
        session.flush()
        origin_airport, destination_airport = _leg_airports(session, leg)
        segment = Segment(
            route_id=route.id,
            mode=SegmentMode.air,
            origin_airport=origin_airport,
            destination_airport=destination_airport,
            order=1,
        )
        session.add(segment)
    if commit:
        session.commit()
        session.refresh(segment)
    else:
        session.flush()
    return segment


def default_segment_for_leg(session: Session, leg_id: uuid.UUID) -> Segment | None:
    """`Trecho` default do `Trajeto`: primeiro `Trecho` da primeira `Rota`."""
    routes = list_routes(session, leg_id)
    if not routes:
        return None
    segments = list_segments(session, routes[0].id)
    return segments[0] if segments else None


def leg_segment_ids(session: Session, leg_id: uuid.UUID) -> list[uuid.UUID]:
    """IDs de todos os `Trecho`s sob qualquer `Rota` do `Trajeto`."""
    return list(
        session.exec(
            select(Segment.id)
            .join(Route, col(Route.id) == col(Segment.route_id))
            .where(col(Route.leg_id) == leg_id)
        )
    )


def segment_leg_id(session: Session, segment_id: uuid.UUID) -> uuid.UUID | None:
    """`Trajeto` dono do `Trecho` (via `Rota`), ou None."""
    segment = session.get(Segment, segment_id)
    if segment is None:
        return None
    route = session.get(Route, segment.route_id)
    return route.leg_id if route is not None else None


def segment_trip_id(session: Session, segment_id: uuid.UUID) -> uuid.UUID | None:
    """`Viagem` dona do `Trecho` (via `Rota`→`Trajeto`), ou None."""
    leg_id = segment_leg_id(session, segment_id)
    if leg_id is None:
        return None
    leg = session.get(Leg, leg_id)
    return leg.trip_id if leg is not None else None


def delete_routes_for_leg(session: Session, leg_id: uuid.UUID, *, commit: bool = True) -> None:
    """Apaga `Rota`s e `Trecho`s de um `Trajeto` (cascata antes de remover o Leg).

    Pressupõe que não há `Pesquisa` ancorada (o chamador já validou via
    `leg_has_fare_quotes`).
    """
    routes = list_routes(session, leg_id)
    for route in routes:
        for segment in list_segments(session, route.id):
            session.delete(segment)
        session.delete(route)
    if commit:
        session.commit()
    else:
        session.flush()


def trip_has_segments(session: Session, trip_id: uuid.UUID) -> bool:
    count = session.exec(
        select(func.count())
        .select_from(Segment)
        .join(Route, col(Route.id) == col(Segment.route_id))
        .join(Leg, col(Leg.id) == col(Route.leg_id))
        .where(col(Leg.trip_id) == trip_id)
    ).one()
    return count > 0
