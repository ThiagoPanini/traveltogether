"""Serviço para marcar/desmarcar Pesquisa Escolhida (invariante 5)."""

import uuid

from sqlmodel import Session, col, select

from traveltogether.fares.models import FareQuote


def mark_chosen(session: Session, leg_id: uuid.UUID, fare_id: uuid.UUID) -> FareQuote:
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
    return fare
