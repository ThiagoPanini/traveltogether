"""Lógica de domínio para o boundary trips."""

import uuid
from datetime import date, datetime

from sqlmodel import Session, col, select

from traveltogether.trips.models import (
    ItineraryItem,
    Leg,
    Membership,
    MembershipRole,
    PendingActionKind,
    PendingActionPublic,
    Stop,
    Trip,
)


class TripPeriodError(ValueError):
    """end_date anterior a start_date."""


def _validate_period(start_date: date | None, end_date: date | None) -> None:
    if start_date and end_date and end_date < start_date:
        raise TripPeriodError("end_date não pode ser anterior a start_date")


def create_trip(
    session: Session,
    creator_id: uuid.UUID,
    name: str,
    description: str,
    origin: str,
    *,
    airport_code: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[Trip, Membership]:
    """Cria uma Viagem e registra o criador como Organizador (invariante 2)."""
    _validate_period(start_date, end_date)
    trip = Trip(
        name=name,
        description=description,
        origin=origin,
        created_by=creator_id,
        airport_code=airport_code.upper() if airport_code else None,
        latitude=latitude,
        longitude=longitude,
        start_date=start_date,
        end_date=end_date,
    )
    session.add(trip)
    session.flush()

    membership = Membership(trip_id=trip.id, user_id=creator_id, role=MembershipRole.organizer)
    session.add(membership)
    session.commit()
    session.refresh(trip)
    session.refresh(membership)
    return trip, membership


def list_user_trips(session: Session, user_id: uuid.UUID) -> list[tuple[Trip, Membership]]:
    """Retorna Viagens em que o usuário tem Membership, junto com o papel."""
    rows = session.exec(
        select(Trip, Membership)
        .join(Membership, Membership.trip_id == Trip.id)  # type: ignore[arg-type]
        .where(Membership.user_id == user_id)
        .order_by(Trip.created_at.desc())  # type: ignore[attr-defined]
    ).all()
    return list(rows)


def list_user_trip_summaries(
    session: Session, user_id: uuid.UUID
) -> list[tuple[Trip, Membership, list[Stop]]]:
    """Retorna Viagens do usuário com Paradas ordenadas para cards de lista."""
    rows = list_user_trips(session, user_id)
    trip_ids = [trip.id for trip, _ in rows]
    stops_by_trip: dict[uuid.UUID, list[Stop]] = {trip_id: [] for trip_id in trip_ids}

    if trip_ids:
        stops = session.exec(
            select(Stop)
            .where(col(Stop.trip_id).in_(trip_ids))
            .order_by(col(Stop.trip_id), col(Stop.order))
        )
        for stop in stops:
            stops_by_trip[stop.trip_id].append(stop)

    return [(trip, membership, stops_by_trip[trip.id]) for trip, membership in rows]


def _leg_label(leg: Leg, trip: Trip, stop_by_id: dict[uuid.UUID, Stop]) -> str:
    """Rótulo curto do Trajeto: 'GRU → LIS', caindo p/ origem da Viagem nas pontas."""

    def point(stop_id: uuid.UUID | None) -> str:
        if stop_id is not None and stop_id in stop_by_id:
            stop = stop_by_id[stop_id]
            return stop.airport_code or stop.city
        return trip.airport_code or trip.origin

    return f"{point(leg.origin_stop_id)} → {point(leg.destination_stop_id)}"


def list_pending_actions(session: Session, user_id: uuid.UUID) -> list[PendingActionPublic]:
    """Pendências derivadas cross-Viagem p/ o painel 'O que precisa de mim' (#58).

    Sem entidade nova: agrega Trajetos sem Pesquisa, Pesquisas sem Escolhida e
    Paradas sem Roteiro de todas as Viagens do usuário, sem N+1. Cruza o boundary
    fares apenas via service (`leg_fare_status`), nunca importando FareQuote.
    """
    # import local p/ evitar acoplar o módulo trips ao import-time de fares
    from traveltogether.fares.service import leg_fare_status
    from traveltogether.trips.itinerary_service import stop_ids_with_itinerary

    summaries = list_user_trip_summaries(session, user_id)
    if not summaries:
        return []

    trips_by_id = {trip.id: trip for trip, _, _ in summaries}
    stops_all = [stop for _, _, stops in summaries for stop in stops]
    stop_by_id = {stop.id: stop for stop in stops_all}

    legs = list_legs_for_trips(session, list(trips_by_id))
    fare_status = leg_fare_status(session, [leg.id for leg in legs])
    with_itinerary = stop_ids_with_itinerary(session, [stop.id for stop in stops_all])

    actions: list[PendingActionPublic] = []
    for leg in legs:
        trip = trips_by_id[leg.trip_id]
        count, has_chosen = fare_status.get(leg.id, (0, False))
        if count == 0:
            kind = PendingActionKind.leg_without_fare
        elif not has_chosen:
            kind = PendingActionKind.fare_without_chosen
        else:
            continue
        actions.append(
            PendingActionPublic(
                kind=kind,
                trip_id=trip.id,
                trip_name=trip.name,
                target_kind="leg",
                target_id=leg.id,
                label=_leg_label(leg, trip, stop_by_id),
            )
        )

    for stop in stops_all:
        if stop.id in with_itinerary:
            continue
        trip = trips_by_id[stop.trip_id]
        actions.append(
            PendingActionPublic(
                kind=PendingActionKind.stop_without_itinerary,
                trip_id=trip.id,
                trip_name=trip.name,
                target_kind="stop",
                target_id=stop.id,
                label=stop.airport_code or stop.city,
            )
        )

    return actions


def list_legs_for_trips(session: Session, trip_ids: list[uuid.UUID]) -> list[Leg]:
    """Trajetos de um conjunto de Viagens, ordenados, numa query (sem N+1)."""
    if not trip_ids:
        return []
    return list(
        session.exec(
            select(Leg)
            .where(col(Leg.trip_id).in_(trip_ids))
            .order_by(col(Leg.trip_id), col(Leg.order))
        )
    )


def get_trip_membership(
    session: Session, trip_id: uuid.UUID, user_id: uuid.UUID
) -> Membership | None:
    """Retorna a Membership do usuário na Viagem, ou None se não for membro."""
    return session.exec(
        select(Membership).where(Membership.trip_id == trip_id).where(Membership.user_id == user_id)
    ).first()


def get_trip_member_ids(session: Session, trip_id: uuid.UUID) -> list[uuid.UUID]:
    """Ids dos `Usuário`s membros da Viagem.

    Interface explícita para outros boundaries fanout de Notificação sem
    importar o model Membership (ADR-0014/0017).
    """
    return list(session.exec(select(Membership.user_id).where(Membership.trip_id == trip_id)).all())


def count_memberships(session: Session, trip_id: uuid.UUID) -> int:
    """Nº de `Membership`s da Viagem — denominador do rateio (invariante 19).

    Interface explícita para o boundary budget sem importar o model Membership.
    """
    return len(session.exec(select(Membership.id).where(col(Membership.trip_id) == trip_id)).all())


def stop_period(
    session: Session, stop_id: uuid.UUID
) -> tuple[datetime | None, datetime | None] | None:
    """Datas (chegada, partida) de uma Parada, ou None se não existir.

    Interface explícita para o boundary budget derivar as noites da `Hospedagem`
    sem importar o model Stop (ADR-0014/0016).
    """
    stop = session.get(Stop, stop_id)
    if stop is None:
        return None
    return (stop.arrival_date, stop.departure_date)


def itinerary_item_trip_id(session: Session, item_id: uuid.UUID) -> uuid.UUID | None:
    """Retorna a Viagem dona do Item de Roteiro (via Parada), ou None se não existir.

    Interface explícita para outros boundaries validarem o alvo sem importar
    o model ItineraryItem (ADR-0014).
    """
    item = session.get(ItineraryItem, item_id)
    if item is None:
        return None
    stop = session.get(Stop, item.stop_id)
    return stop.trip_id if stop is not None else None


def stop_trip_id(session: Session, stop_id: uuid.UUID) -> uuid.UUID | None:
    """Retorna a Viagem dona da Parada, ou None se não existir."""
    stop = session.get(Stop, stop_id)
    return stop.trip_id if stop is not None else None


def leg_trip_id(session: Session, leg_id: uuid.UUID) -> uuid.UUID | None:
    """Retorna a Viagem dona do Trajeto, ou None se não existir."""
    leg = session.get(Leg, leg_id)
    return leg.trip_id if leg is not None else None


def update_trip(
    session: Session,
    trip: Trip,
    name: str | None,
    description: str | None,
    origin: str | None,
    *,
    airport_code: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Trip:
    """Atualiza metadados da Viagem — chamador garante que é Organizador (invariante 7)."""
    new_start = start_date if start_date is not None else trip.start_date
    new_end = end_date if end_date is not None else trip.end_date
    _validate_period(new_start, new_end)

    if name is not None:
        trip.name = name
    if description is not None:
        trip.description = description
    if origin is not None:
        trip.origin = origin
    if airport_code is not None:
        trip.airport_code = airport_code.upper()
    if latitude is not None:
        trip.latitude = latitude
    if longitude is not None:
        trip.longitude = longitude
    if start_date is not None:
        trip.start_date = start_date
    if end_date is not None:
        trip.end_date = end_date
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip
