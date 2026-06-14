"""Serviço de Roteiro (ItineraryItem) por Parada."""

import uuid
from collections.abc import Sequence
from datetime import date

from sqlmodel import Session, col, func, select

from traveltogether.trips.models import ItineraryItem


def stop_ids_with_itinerary(session: Session, stop_ids: Sequence[uuid.UUID]) -> set[uuid.UUID]:
    """Subconjunto de Paradas que já têm ≥1 Item de Roteiro (painel #58, sem N+1)."""
    if not stop_ids:
        return set()
    rows = session.exec(
        select(ItineraryItem.stop_id).where(col(ItineraryItem.stop_id).in_(stop_ids)).distinct()
    )
    return set(rows)


def list_itinerary_items(session: Session, stop_id: uuid.UUID) -> list[ItineraryItem]:
    return list(
        session.exec(
            select(ItineraryItem)
            .where(col(ItineraryItem.stop_id) == stop_id)
            .order_by(col(ItineraryItem.order))
        )
    )


def create_itinerary_item(
    session: Session,
    stop_id: uuid.UUID,
    title: str,
    notes: str = "",
    link: str = "",
    day: date | None = None,
    time: str | None = None,
) -> ItineraryItem:
    current_count = session.exec(
        select(func.count()).select_from(ItineraryItem).where(col(ItineraryItem.stop_id) == stop_id)
    ).one()
    item = ItineraryItem(
        stop_id=stop_id,
        title=title,
        notes=notes,
        link=link,
        day=day,
        time=time,
        order=current_count + 1,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def update_itinerary_item(
    session: Session,
    item: ItineraryItem,
    title: str | None = None,
    notes: str | None = None,
    link: str | None = None,
    day: date | None = None,
    time: str | None = None,
) -> ItineraryItem:
    if title is not None:
        item.title = title
    if notes is not None:
        item.notes = notes
    if link is not None:
        item.link = link
    if day is not None:
        item.day = day
    if time is not None:
        item.time = time
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def delete_itinerary_item(session: Session, item: ItineraryItem, *, commit: bool = True) -> None:
    session.delete(item)
    if commit:
        session.commit()


def reorder_itinerary_items(
    session: Session,
    stop_id: uuid.UUID,
    item_ids: list[uuid.UUID],
    *,
    commit: bool = True,
) -> None:
    items = {i.id: i for i in list_itinerary_items(session, stop_id)}
    for new_order, item_id in enumerate(item_ids, start=1):
        items[item_id].order = new_order
        session.add(items[item_id])
    if commit:
        session.commit()
