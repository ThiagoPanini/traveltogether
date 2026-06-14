"""Atividade recente do grupo para o painel (#71)."""

import uuid

from sqlmodel import Session, col, select

from traveltogether.trips.models import (
    ActivityItemPublic,
    ActivityKind,
    Leg,
    Membership,
    Trip,
)


def list_recent_activity(
    session: Session,
    user_id: uuid.UUID,
    limit: int = 20,
) -> list[ActivityItemPublic]:
    """Agrega atividade recente de todas as Viagens do usuário.

    Retorna até `limit` itens ordenados por `occurred_at` DESC.
    Cruza boundaries via lazy local imports (evita acoplamento de import-time).
    """
    memberships = session.exec(select(Membership).where(col(Membership.user_id) == user_id)).all()
    trip_ids = [m.trip_id for m in memberships]
    if not trip_ids:
        return []

    trips = session.exec(select(Trip).where(col(Trip.id).in_(trip_ids))).all()
    trip_by_id = {t.id: t for t in trips}

    items: list[ActivityItemPublic] = []

    # ── member_joined: outros membros que entraram nessas Viagens ────────────
    other_memberships = session.exec(
        select(Membership)
        .where(col(Membership.trip_id).in_(trip_ids))
        .where(col(Membership.user_id) != user_id)
    ).all()
    actor_ids = list({m.user_id for m in other_memberships})

    from traveltogether.identity.service import get_users_by_ids  # noqa: PLC0415

    users = get_users_by_ids(session, actor_ids)
    for mem in other_memberships:
        trip = trip_by_id.get(mem.trip_id)
        if trip is None:
            continue
        actor = users.get(mem.user_id)
        actor_name = actor.display_name if actor else None
        items.append(
            ActivityItemPublic(
                id=mem.id,
                kind=ActivityKind.member_joined,
                trip_id=mem.trip_id,
                trip_name=trip.name,
                actor_name=actor_name,
                body=f"{actor_name or 'alguém'} entrou na viagem",
                occurred_at=mem.joined_at,
            )
        )

    # ── comment: comentários em Viagens do usuário ───────────────────────────
    from traveltogether.collaboration.models import Comment  # noqa: PLC0415

    comments = session.exec(select(Comment).where(col(Comment.trip_id).in_(trip_ids))).all()
    comment_actor_ids = list({c.author_id for c in comments})
    comment_users = get_users_by_ids(session, comment_actor_ids)
    for comment in comments:
        trip = trip_by_id.get(comment.trip_id)
        if trip is None:
            continue
        actor = comment_users.get(comment.author_id)
        items.append(
            ActivityItemPublic(
                id=comment.id,
                kind=ActivityKind.comment,
                trip_id=comment.trip_id,
                trip_name=trip.name,
                actor_name=actor.display_name if actor else None,
                body=comment.body,
                occurred_at=comment.created_at,
            )
        )

    # ── fare_registered: Pesquisas registradas em Trajetos dessas Viagens ────
    from traveltogether.fares.models import FareQuote  # noqa: PLC0415

    legs = session.exec(select(Leg).where(col(Leg.trip_id).in_(trip_ids))).all()
    leg_ids = [leg.id for leg in legs]
    leg_to_trip_id = {leg.id: leg.trip_id for leg in legs}
    if leg_ids:
        fares = session.exec(select(FareQuote).where(col(FareQuote.leg_id).in_(leg_ids))).all()
        fare_actor_ids = list({f.registered_by for f in fares})
        fare_users = get_users_by_ids(session, fare_actor_ids)
        for fare in fares:
            trip_id = leg_to_trip_id.get(fare.leg_id)
            if trip_id is None:
                continue
            trip = trip_by_id.get(trip_id)
            if trip is None:
                continue
            actor = fare_users.get(fare.registered_by)
            items.append(
                ActivityItemPublic(
                    id=fare.id,
                    kind=ActivityKind.fare_registered,
                    trip_id=trip_id,
                    trip_name=trip.name,
                    actor_name=actor.display_name if actor else None,
                    body=f"{fare.origin_airport} → {fare.destination_airport} · {fare.airline}",
                    occurred_at=fare.created_at,
                )
            )

    items.sort(key=lambda i: i.occurred_at, reverse=True)
    return items[:limit]
