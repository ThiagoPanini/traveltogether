"""Serviço de pesquisas de passagem (fare quotes)."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlmodel import Session, col, select

from traveltogether.fares.models import FareQuote


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
) -> FareQuote:
    fare = FareQuote(
        leg_id=leg_id,
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
    session.commit()
    session.refresh(fare)
    return fare


def list_fare_quotes(session: Session, leg_id: uuid.UUID) -> list[FareQuote]:
    return list(
        session.exec(
            select(FareQuote)
            .where(col(FareQuote.leg_id) == leg_id)
            .order_by(col(FareQuote.created_at))
        )
    )


def leg_has_fare_quotes(session: Session, leg_id: uuid.UUID) -> bool:
    return (
        session.exec(select(FareQuote.id).where(col(FareQuote.leg_id) == leg_id)).first()
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
    session.delete(fare)
    session.commit()
