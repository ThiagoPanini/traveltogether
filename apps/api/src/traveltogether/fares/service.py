"""Serviço de pesquisas de passagem (fare quotes).

A `Pesquisa de Passagem` ancora no `Trecho` (Segment) via `fare_quote_segments`
(ADR-0018/0019), não mais no `Trajeto` (Leg) direto. Os endpoints do board
continuam endereçados por `Trajeto` e resolvem o `Trecho` default da `Rota`
"direta" (migração aditiva do #143); o `Trecho`/`Rota` reais chegam no #144.
"""

import uuid
from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

from sqlmodel import Session, col, select

from traveltogether.fares.models import FareQuote, FareQuotePublic, FareQuoteSegment
from traveltogether.trips.models import Leg, Route, Segment
from traveltogether.trips.routes_service import default_segment_for_leg


class SegmentNotFoundError(Exception):
    """Raised when a Leg has no resolvable default Segment (skeleton invariant)."""


def fare_segment_ids(session: Session, fare_id: uuid.UUID) -> list[uuid.UUID]:
    """`Trecho`s cobertos por uma `Pesquisa` (≥1; 1 no esqueleto)."""
    return list(
        session.exec(
            select(FareQuoteSegment.segment_id).where(
                col(FareQuoteSegment.fare_quote_id) == fare_id
            )
        )
    )


def fare_primary_segment_id(session: Session, fare_id: uuid.UUID) -> uuid.UUID | None:
    ids = fare_segment_ids(session, fare_id)
    return ids[0] if ids else None


def fare_leg_id(session: Session, fare_id: uuid.UUID) -> uuid.UUID | None:
    """`Trajeto` que hospeda a `Pesquisa` (via primeiro `Trecho`→`Rota`)."""
    segment_id = fare_primary_segment_id(session, fare_id)
    if segment_id is None:
        return None
    segment = session.get(Segment, segment_id)
    if segment is None:
        return None
    route = session.get(Route, segment.route_id)
    return route.leg_id if route is not None else None


def fare_quote_trip_id(session: Session, fare_id: uuid.UUID) -> uuid.UUID | None:
    """Retorna a Viagem dona da Pesquisa (via Trecho→Rota→Trajeto), ou None.

    Interface explícita para outros boundaries validarem o alvo sem importar
    o model FareQuote (ADR-0014).
    """
    leg_id = fare_leg_id(session, fare_id)
    if leg_id is None:
        return None
    leg = session.get(Leg, leg_id)
    return leg.trip_id if leg is not None else None


def _link_fare_to_segment(session: Session, fare_id: uuid.UUID, segment_id: uuid.UUID) -> None:
    session.add(FareQuoteSegment(fare_quote_id=fare_id, segment_id=segment_id))


def fare_to_public(session: Session, fare: FareQuote) -> FareQuotePublic:
    """DTO `FareQuotePublic` com `leg_id`/`segment_id` resolvidos do `Trecho`.

    `leg_id` é derivado (não persistido) — back-compat com o board do `Trajeto`.
    """
    segment_id = fare_primary_segment_id(session, fare.id)
    leg_id = fare_leg_id(session, fare.id)
    if segment_id is None or leg_id is None:
        raise SegmentNotFoundError(f"fare {fare.id} is not anchored to a segment")
    return FareQuotePublic(
        id=fare.id,
        leg_id=leg_id,
        segment_id=segment_id,
        registered_by=fare.registered_by,
        created_at=fare.created_at,
        value=fare.value,
        currency=fare.currency,
        flight_date=fare.flight_date,
        duration_minutes=fare.duration_minutes,
        stops=fare.stops,
        checked_baggage=fare.checked_baggage,
        origin_airport=fare.origin_airport,
        destination_airport=fare.destination_airport,
        airline=fare.airline,
        link=fare.link,
        notes=fare.notes,
        is_chosen=fare.is_chosen,
    )


def create_fare_quote(
    session: Session,
    leg_id: uuid.UUID,
    registered_by: uuid.UUID,
    value: Decimal,
    currency: str,
    flight_date: datetime,
    duration_minutes: int,
    origin_airport: str,
    destination_airport: str,
    airline: str,
    stops: int = 0,
    checked_baggage: bool = False,
    link: str = "",
    notes: str = "",
    segment_id: uuid.UUID | None = None,
) -> FareQuote:
    """Cria uma `Pesquisa` ancorada num `Trecho`.

    `segment_id` explícito ancora ali; senão resolve o `Trecho` default do
    `Trajeto` (`leg_id`) — a `Rota` "direta" do esqueleto.
    """
    if segment_id is None:
        segment = default_segment_for_leg(session, leg_id)
        if segment is None:
            raise SegmentNotFoundError(f"leg {leg_id} has no default segment")
        segment_id = segment.id
    fare = FareQuote(
        registered_by=registered_by,
        value=value,
        currency=currency,
        flight_date=flight_date,
        duration_minutes=duration_minutes,
        stops=stops,
        checked_baggage=checked_baggage,
        origin_airport=origin_airport,
        destination_airport=destination_airport,
        airline=airline,
        link=link,
        notes=notes,
    )
    session.add(fare)
    session.flush()
    _link_fare_to_segment(session, fare.id, segment_id)
    session.commit()
    session.refresh(fare)
    return fare


def _fares_for_segment_ids(session: Session, segment_ids: Sequence[uuid.UUID]) -> list[FareQuote]:
    if not segment_ids:
        return []
    return list(
        session.exec(
            select(FareQuote)
            .join(FareQuoteSegment, col(FareQuoteSegment.fare_quote_id) == col(FareQuote.id))
            .where(col(FareQuoteSegment.segment_id).in_(segment_ids))
            .distinct()
            .order_by(col(FareQuote.created_at))
        )
    )


def list_fares_for_segment(session: Session, segment_id: uuid.UUID) -> list[FareQuote]:
    return _fares_for_segment_ids(session, [segment_id])


def list_fare_quotes(session: Session, leg_id: uuid.UUID) -> list[FareQuote]:
    """`Pesquisa`s do board do `Trajeto`: as ancoradas nos `Trecho`s do `Trajeto`."""
    from traveltogether.trips.routes_service import leg_segment_ids

    return _fares_for_segment_ids(session, leg_segment_ids(session, leg_id))


def leg_fare_status(
    session: Session, leg_ids: Sequence[uuid.UUID]
) -> dict[uuid.UUID, tuple[int, bool]]:
    """Para cada Trajeto com ≥1 Pesquisa: (qtd de Pesquisas, tem Escolhida).

    Trajetos sem Pesquisa ficam ausentes do dict. Interface explícita para o
    painel (#58) agregar pendências cross-Viagem sem N+1 (ADR-0014).
    """
    if not leg_ids:
        return {}
    status: dict[uuid.UUID, tuple[int, bool]] = {}
    rows = session.exec(
        select(Route.leg_id, FareQuote.is_chosen)
        .join(Segment, col(Segment.route_id) == col(Route.id))
        .join(FareQuoteSegment, col(FareQuoteSegment.segment_id) == col(Segment.id))
        .join(FareQuote, col(FareQuote.id) == col(FareQuoteSegment.fare_quote_id))
        .where(col(Route.leg_id).in_(leg_ids))
    )
    for leg_id, is_chosen in rows:
        count, has_chosen = status.get(leg_id, (0, False))
        status[leg_id] = (count + 1, has_chosen or is_chosen)
    return status


def chosen_fare_costs_for_trip(session: Session, trip_id: uuid.UUID) -> list[tuple[Decimal, str]]:
    """Custos das `Pesquisa de Passagem`s `Escolhida`s de uma Viagem: (valor, moeda).

    Interface explícita para o boundary budget agregar o Orçamento sem importar
    o model FareQuote (ADR-0014/0016). A passagem é por pessoa.
    """
    rows = session.exec(
        select(FareQuote)
        .join(FareQuoteSegment, col(FareQuoteSegment.fare_quote_id) == col(FareQuote.id))
        .join(Segment, col(Segment.id) == col(FareQuoteSegment.segment_id))
        .join(Route, col(Route.id) == col(Segment.route_id))
        .join(Leg, col(Leg.id) == col(Route.leg_id))
        .where(col(Leg.trip_id) == trip_id)
        .where(col(FareQuote.is_chosen).is_(True))
        .distinct()
    )
    return [(fare.value, fare.currency) for fare in rows]


def leg_has_fare_quotes(session: Session, leg_id: uuid.UUID) -> bool:
    from traveltogether.trips.routes_service import leg_segment_ids

    segment_ids = leg_segment_ids(session, leg_id)
    if not segment_ids:
        return False
    return (
        session.exec(
            select(FareQuoteSegment.fare_quote_id).where(
                col(FareQuoteSegment.segment_id).in_(segment_ids)
            )
        ).first()
        is not None
    )


def update_fare_quote(
    session: Session,
    fare: FareQuote,
    value: Decimal | None = None,
    currency: str | None = None,
    flight_date: datetime | None = None,
    duration_minutes: int | None = None,
    stops: int | None = None,
    checked_baggage: bool | None = None,
    origin_airport: str | None = None,
    destination_airport: str | None = None,
    airline: str | None = None,
    link: str | None = None,
    notes: str | None = None,
) -> FareQuote:
    if value is not None:
        fare.value = value
    if currency is not None:
        fare.currency = currency
    if flight_date is not None:
        fare.flight_date = flight_date
    if duration_minutes is not None:
        fare.duration_minutes = duration_minutes
    if stops is not None:
        fare.stops = stops
    if checked_baggage is not None:
        fare.checked_baggage = checked_baggage
    if origin_airport is not None:
        fare.origin_airport = origin_airport
    if destination_airport is not None:
        fare.destination_airport = destination_airport
    if airline is not None:
        fare.airline = airline
    if link is not None:
        fare.link = link
    if notes is not None:
        fare.notes = notes
    session.add(fare)
    session.commit()
    session.refresh(fare)
    return fare


def delete_fare_quote(session: Session, fare: FareQuote) -> None:
    for link in session.exec(
        select(FareQuoteSegment).where(col(FareQuoteSegment.fare_quote_id) == fare.id)
    ):
        session.delete(link)
    session.delete(fare)
    session.commit()
