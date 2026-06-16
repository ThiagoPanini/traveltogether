"""Lógica de domínio do boundary budget (Orçamento — ADR-0016).

CRUD das linhas `Hospedagem`/`Extra` e a agregação do `Orçamento` em subtotais
**por moeda**, com recortes por pessoa e por grupo. Não há conversão de câmbio
(invariante 15): moedas distintas viram subtotais separados. O rateio das linhas
`split` divide pelo nº de `Membership`s (invariante 19).

A agregação lê as `Escolhida`s via `fares.service` e as `Parada`s/`Membership`s
via `trips.service`, nunca importando seus modelos (ADR-0014).
"""

import uuid
from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from sqlmodel import Session, col, select

from traveltogether.budget.models import (
    BudgetSummary,
    CurrencySubtotal,
    Extra,
    Lodging,
    RateioBasis,
)


def create_lodging(
    session: Session,
    trip_id: uuid.UUID,
    stop_id: uuid.UUID,
    created_by: uuid.UUID,
    nightly_value: Decimal,
    currency: str,
    basis: RateioBasis,
    description: str = "",
) -> Lodging:
    lodging = Lodging(
        trip_id=trip_id,
        stop_id=stop_id,
        created_by=created_by,
        nightly_value=nightly_value,
        currency=currency,
        basis=basis,
        description=description,
    )
    session.add(lodging)
    session.commit()
    session.refresh(lodging)
    return lodging


def list_lodgings(session: Session, trip_id: uuid.UUID) -> list[Lodging]:
    return list(
        session.exec(
            select(Lodging).where(col(Lodging.trip_id) == trip_id).order_by(col(Lodging.created_at))
        )
    )


def update_lodging(
    session: Session,
    lodging: Lodging,
    stop_id: uuid.UUID | None = None,
    description: str | None = None,
    nightly_value: Decimal | None = None,
    currency: str | None = None,
    basis: RateioBasis | None = None,
) -> Lodging:
    if stop_id is not None:
        lodging.stop_id = stop_id
    if description is not None:
        lodging.description = description
    if nightly_value is not None:
        lodging.nightly_value = nightly_value
    if currency is not None:
        lodging.currency = currency
    if basis is not None:
        lodging.basis = basis
    session.add(lodging)
    session.commit()
    session.refresh(lodging)
    return lodging


def delete_lodging(session: Session, lodging: Lodging) -> None:
    session.delete(lodging)
    session.commit()


def create_extra(
    session: Session,
    trip_id: uuid.UUID,
    created_by: uuid.UUID,
    value: Decimal,
    currency: str,
    basis: RateioBasis,
    description: str = "",
) -> Extra:
    extra = Extra(
        trip_id=trip_id,
        created_by=created_by,
        value=value,
        currency=currency,
        basis=basis,
        description=description,
    )
    session.add(extra)
    session.commit()
    session.refresh(extra)
    return extra


def list_extras(session: Session, trip_id: uuid.UUID) -> list[Extra]:
    return list(
        session.exec(
            select(Extra).where(col(Extra.trip_id) == trip_id).order_by(col(Extra.created_at))
        )
    )


def update_extra(
    session: Session,
    extra: Extra,
    description: str | None = None,
    value: Decimal | None = None,
    currency: str | None = None,
    basis: RateioBasis | None = None,
) -> Extra:
    if description is not None:
        extra.description = description
    if value is not None:
        extra.value = value
    if currency is not None:
        extra.currency = currency
    if basis is not None:
        extra.basis = basis
    session.add(extra)
    session.commit()
    session.refresh(extra)
    return extra


def delete_extra(session: Session, extra: Extra) -> None:
    session.delete(extra)
    session.commit()


def _lodging_nights(arrival: datetime | None, departure: datetime | None) -> int:
    """Noites derivadas das datas da Parada: dias entre chegada e partida.

    Sem datas (ou período inválido) → 0 noites, logo a linha não entra no
    subtotal. Compara só a parte de data.
    """
    if arrival is None or departure is None:
        return 0
    nights = (departure.date() - arrival.date()).days
    return nights if nights > 0 else 0


def aggregate_budget(session: Session, trip_id: uuid.UUID) -> BudgetSummary:
    """Agrega o Orçamento da Viagem em subtotais por moeda (ADR-0016).

    Soma três fontes — `Escolhida`s, `Hospedagem`s, `Extra`s — acumulando por
    moeda. Cada linha contribui um valor **por grupo** e um **por pessoa**:
    - `per_person`: o valor já é por cabeça → por pessoa = valor, por grupo = valor × nº pessoas.
    - `split`: o valor é do grupo → por grupo = valor, por pessoa = valor ÷ nº pessoas.
    As `Escolhida`s (passagens) contam como `per_person`. Nunca cruza moedas.
    """
    # imports locais p/ não acoplar o import-time de budget a fares/trips
    from traveltogether.fares.service import chosen_fare_costs_for_trip
    from traveltogether.trips.service import count_memberships, stop_period

    member_count = count_memberships(session, trip_id)

    per_group: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    per_person: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))

    def add_per_person_line(currency: str, value: Decimal) -> None:
        per_person[currency] += value
        per_group[currency] += value * member_count

    def add_split_line(currency: str, value: Decimal) -> None:
        per_group[currency] += value
        if member_count > 0:
            per_person[currency] += value / member_count

    def add_line(currency: str, value: Decimal, basis: RateioBasis) -> None:
        if basis == RateioBasis.per_person:
            add_per_person_line(currency, value)
        else:
            add_split_line(currency, value)

    # Passagens Escolhidas — por pessoa (cada viajante compra a própria).
    for value, currency in chosen_fare_costs_for_trip(session, trip_id):
        add_per_person_line(currency, value)

    # Hospedagens — valor por noite × noites derivadas da Parada.
    for lodging in list_lodgings(session, trip_id):
        period = stop_period(session, lodging.stop_id)
        arrival, departure = period if period is not None else (None, None)
        nights = _lodging_nights(arrival, departure)
        if nights == 0:
            continue
        add_line(lodging.currency, lodging.nightly_value * nights, lodging.basis)

    # Extras — valor único no nível da Viagem.
    for extra in list_extras(session, trip_id):
        add_line(extra.currency, extra.value, extra.basis)

    currencies = sorted(set(per_group) | set(per_person))
    subtotals = [
        CurrencySubtotal(
            currency=currency,
            per_group=per_group[currency],
            per_person=per_person[currency],
        )
        for currency in currencies
    ]
    return BudgetSummary(member_count=member_count, subtotals=subtotals)
