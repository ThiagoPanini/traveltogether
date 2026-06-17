"""Decisão por-pessoa: `Preferida` e `Comprada` (ADR-0018, invariantes 11/13).

Aposenta a `Escolhida` de grupo. Cada `Usuário` marca no máximo uma `Pesquisa`
`Preferida` por `Trecho` aéreo (a que vai usar) e informa a `Comprada`. A marca
é só do dono; ninguém altera a do outro. A `Rota` adotada é derivada das
`Preferida`s (invariantes 23/24), não persistida.
"""

import uuid
from collections.abc import Sequence
from decimal import Decimal

from sqlmodel import Session, col, select

from traveltogether.fares.models import FareQuote, FareQuoteSegment, Preference
from traveltogether.fares.service import fare_segment_ids
from traveltogether.trips.models import Leg, Route, Segment


class PreferenceError(ValueError):
    """Marca/compra inválida (Pesquisa inexistente, não-ancorada, sem Preferida)."""


def _segments_for_fare(session: Session, fare_id: uuid.UUID) -> list[uuid.UUID]:
    fare = session.get(FareQuote, fare_id)
    if fare is None:
        raise PreferenceError("fare not found")
    segment_ids = fare_segment_ids(session, fare_id)
    if not segment_ids:
        raise PreferenceError("fare is not anchored to a segment")
    return segment_ids


def _user_pref_for_segment(
    session: Session, user_id: uuid.UUID, segment_id: uuid.UUID
) -> Preference | None:
    return session.exec(
        select(Preference)
        .where(col(Preference.user_id) == user_id)
        .where(col(Preference.segment_id) == segment_id)
    ).first()


def toggle_preference(session: Session, fare_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """Marca/desmarca a `Pesquisa` como `Preferida` do usuário. Retorna estado final.

    Uma `Pesquisa` ida-e-volta cobre vários `Trecho`s → resolve a `Preferida` de
    todos (invariante 11). Já preferida em todos → desmarca; senão move para ela.
    """
    segment_ids = _segments_for_fare(session, fare_id)

    already = all(
        (pref := _user_pref_for_segment(session, user_id, seg)) is not None
        and pref.fare_quote_id == fare_id
        for seg in segment_ids
    )
    if already:
        for seg in segment_ids:
            pref = _user_pref_for_segment(session, user_id, seg)
            if pref is not None:
                session.delete(pref)
        session.commit()
        return False

    for seg in segment_ids:
        pref = _user_pref_for_segment(session, user_id, seg)
        if pref is None:
            session.add(Preference(user_id=user_id, segment_id=seg, fare_quote_id=fare_id))
        else:
            pref.fare_quote_id = fare_id
            pref.purchased = False
            session.add(pref)
    session.commit()
    return True


def toggle_purchased(session: Session, fare_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """Marca/desmarca a `Comprada`. Exige `Preferida` do usuário na `Pesquisa`.

    `Comprada` implica `Preferida` (invariante: o fechamento deriva das Preferidas
    viradas Compradas). Sem Preferida na Pesquisa → erro.
    """
    segment_ids = _segments_for_fare(session, fare_id)
    prefs = [
        pref
        for seg in segment_ids
        if (pref := _user_pref_for_segment(session, user_id, seg)) is not None
        and pref.fare_quote_id == fare_id
    ]
    if len(prefs) != len(segment_ids):
        raise PreferenceError("cannot mark purchased without preferring the fare first")
    new_state = not all(p.purchased for p in prefs)
    for pref in prefs:
        pref.purchased = new_state
        session.add(pref)
    session.commit()
    return new_state


def user_prefers_fare(session: Session, fare_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return (
        session.exec(
            select(Preference.id)
            .where(col(Preference.user_id) == user_id)
            .where(col(Preference.fare_quote_id) == fare_id)
        ).first()
        is not None
    )


def user_purchased_fare(session: Session, fare_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return (
        session.exec(
            select(Preference.id)
            .where(col(Preference.user_id) == user_id)
            .where(col(Preference.fare_quote_id) == fare_id)
            .where(col(Preference.purchased).is_(True))
        ).first()
        is not None
    )


def fare_marker_ids(
    session: Session, fare_id: uuid.UUID
) -> tuple[list[uuid.UUID], list[uuid.UUID]]:
    """(ids que preferem, ids que compraram) a `Pesquisa` — pilha de avatares."""
    preferred: list[uuid.UUID] = []
    purchased: list[uuid.UUID] = []
    seen: set[uuid.UUID] = set()
    for user_id, is_purchased in session.exec(
        select(Preference.user_id, Preference.purchased).where(
            col(Preference.fare_quote_id) == fare_id
        )
    ):
        if user_id in seen:
            continue
        seen.add(user_id)
        preferred.append(user_id)
        if is_purchased:
            purchased.append(user_id)
    return preferred, purchased


def legs_preference_status(
    session: Session, leg_ids: Sequence[uuid.UUID], user_id: uuid.UUID
) -> dict[uuid.UUID, tuple[int, bool]]:
    """Por `Trajeto` com ≥1 `Pesquisa`: (qtd de Pesquisas, o usuário tem Preferida).

    Substitui a antiga `leg_fare_status` de grupo pela visão per-person do painel
    (#58): o que importa é se *eu* já tenho `Preferida` no `Trajeto`.
    """
    if not leg_ids:
        return {}
    status: dict[uuid.UUID, tuple[int, bool]] = {}
    # contagem de Pesquisas por Trajeto (via Trecho→Rota)
    for leg_id, _fare_id in session.exec(
        select(Route.leg_id, FareQuoteSegment.fare_quote_id)
        .join(Segment, col(Segment.route_id) == col(Route.id))
        .join(FareQuoteSegment, col(FareQuoteSegment.segment_id) == col(Segment.id))
        .where(col(Route.leg_id).in_(leg_ids))
        .distinct()
    ):
        count, mine = status.get(leg_id, (0, False))
        status[leg_id] = (count + 1, mine)
    # Trajetos onde o usuário já tem Preferida
    for leg_id in session.exec(
        select(Route.leg_id)
        .join(Segment, col(Segment.route_id) == col(Route.id))
        .join(Preference, col(Preference.segment_id) == col(Segment.id))
        .where(col(Route.leg_id).in_(leg_ids))
        .where(col(Preference.user_id) == user_id)
        .distinct()
    ):
        count, _mine = status.get(leg_id, (0, False))
        status[leg_id] = (count, True)
    return status


def preferred_fare_costs_for_trip(
    session: Session, trip_id: uuid.UUID
) -> list[tuple[Decimal, str]]:
    """Custos das `Pesquisa`s `Preferida`s/`Compradas` por pessoa numa Viagem.

    Interface explícita para o boundary budget (ADR-0016/0018, invariante 19).
    Uma `Pesquisa` ida-e-volta (vários `Trecho`s) entra **uma única vez** por
    pessoa — dedup por (usuário, Pesquisa).

    Cada custo é `(quantidade, unidade)` onde `unidade` é código de moeda OU
    rótulo de programa de fidelidade (ADR-0019, invariante 15 estendido): nada
    se converte. Uma Pesquisa pontos + taxa rende **duas** linhas — a taxa em
    dinheiro (quando > 0) e os pontos no programa — sem cruzar unidades.
    """
    rows = session.exec(
        select(col(Preference.user_id), FareQuote)
        .join(Segment, col(Segment.id) == col(Preference.segment_id))
        .join(Route, col(Route.id) == col(Segment.route_id))
        .join(Leg, col(Leg.id) == col(Route.leg_id))
        .join(FareQuote, col(FareQuote.id) == col(Preference.fare_quote_id))
        .where(col(Leg.trip_id) == trip_id)
    ).all()
    seen: set[tuple[uuid.UUID, uuid.UUID]] = set()
    costs: list[tuple[Decimal, str]] = []
    for user_id, fare in rows:
        key = (user_id, fare.id)
        if key in seen:
            continue
        seen.add(key)
        if fare.value > 0:
            costs.append((fare.value, fare.currency))
        if fare.points is not None and fare.points > 0 and fare.loyalty_program:
            costs.append((Decimal(fare.points), fare.loyalty_program))
    return costs
