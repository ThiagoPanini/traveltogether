"""Serviço para marcar/desmarcar Pesquisa Escolhida (invariante 5)."""

import uuid

from sqlmodel import Session, col, select

from traveltogether.fares.models import FareQuote


def mark_chosen(
    session: Session,
    leg_id: uuid.UUID,
    fare_id: uuid.UUID,
    *,
    actor_id: uuid.UUID | None = None,
) -> FareQuote:
    fare = session.get(FareQuote, fare_id)
    if fare is None or fare.leg_id != leg_id:
        raise ValueError("fare does not belong to leg")

    if fare.is_chosen:
        fare.is_chosen = False
        session.add(fare)
        session.commit()
        session.refresh(fare)
        return fare

    # unmark any currently chosen fare for this leg
    chosen = session.exec(
        select(FareQuote)
        .where(col(FareQuote.leg_id) == leg_id)
        .where(col(FareQuote.is_chosen) == True)  # noqa: E712
    ).first()
    if chosen is not None:
        chosen.is_chosen = False
        session.add(chosen)

    fare.is_chosen = True
    session.add(fare)
    session.commit()
    session.refresh(fare)

    _notify_decision(session, leg_id, actor_id)
    return fare


def _notify_decision(session: Session, leg_id: uuid.UUID, actor_id: uuid.UUID | None) -> None:
    """Avisa os membros da Viagem que uma Pesquisa virou Escolhida (ADR-0017).

    Sem dono de Viagem resolvível (Trajeto sem Trip), não há a quem notificar.
    O ator da escolha não recebe a própria Notificação (invariante 20).
    """
    from traveltogether.notifications.models import NotificationKind  # noqa: PLC0415
    from traveltogether.notifications.service import notify  # noqa: PLC0415
    from traveltogether.trips import service as trips_service  # noqa: PLC0415

    trip_id = trips_service.leg_trip_id(session, leg_id)
    if trip_id is None:
        return

    for member_id in trips_service.get_trip_member_ids(session, trip_id):
        if member_id == actor_id:
            continue
        notify(
            session,
            recipient_id=member_id,
            kind=NotificationKind.decision,
            text="Uma Pesquisa de Passagem foi escolhida",
            trip_id=trip_id,
        )
