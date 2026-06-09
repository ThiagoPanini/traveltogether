"""Serviço de upvotes em pesquisas de passagem."""

import uuid

from sqlmodel import Session, col, func, select

from traveltogether.fares.models import Upvote


def toggle_upvote(
    session: Session,
    fare_quote_id: uuid.UUID,
    user_id: uuid.UUID,
) -> tuple[int, bool]:
    """Toggle upvote. Returns (count, voted) where voted=True means upvote added."""
    existing = session.exec(
        select(Upvote)
        .where(col(Upvote.fare_quote_id) == fare_quote_id)
        .where(col(Upvote.user_id) == user_id)
    ).first()

    if existing is not None:
        session.delete(existing)
        session.commit()
        voted = False
    else:
        session.add(Upvote(fare_quote_id=fare_quote_id, user_id=user_id))
        session.commit()
        voted = True

    count = session.exec(
        select(func.count()).select_from(Upvote).where(col(Upvote.fare_quote_id) == fare_quote_id)
    ).one()

    return count, voted


def get_upvote_count(session: Session, fare_quote_id: uuid.UUID) -> int:
    return session.exec(
        select(func.count()).select_from(Upvote).where(col(Upvote.fare_quote_id) == fare_quote_id)
    ).one()


def user_has_upvoted(session: Session, fare_quote_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return (
        session.exec(
            select(Upvote)
            .where(col(Upvote.fare_quote_id) == fare_quote_id)
            .where(col(Upvote.user_id) == user_id)
        ).first()
        is not None
    )
