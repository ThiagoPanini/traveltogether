"""Digest por e-mail das Notificações não lidas (ADR-0017, #112).

Fecha o ciclo do boundary `notifications`: um job agrega as `Notificação`s não
lidas por destinatário desde o último envio e manda **um** e-mail por pessoa,
agrupado por Viagem. Respeita a preferência de `digest` (lida via `identity`,
ADR-0014) e uma marca d'água por destinatário (`DigestState`) para não reenviar
o que já foi mandado. Sem barramento: lê o estado persistido. Zero FastAPI.
"""

import os
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlmodel import Session, select

from traveltogether.notifications.models import DigestState, Notification

_DEFAULT_WEB_BASE_URL = "https://traveltogether.paninit.com"


@dataclass(frozen=True)
class DigestTripGroup:
    """Bloco do e-mail: uma Viagem e as linhas das suas Notificações."""

    trip_id: uuid.UUID
    trip_name: str
    lines: list[str]


@dataclass(frozen=True)
class DigestEmail:
    """Payload de um e-mail de digest pronto para envio."""

    recipient_id: uuid.UUID
    recipient_email: str
    recipient_name: str | None
    groups: list[DigestTripGroup]
    inbox_url: str

    @property
    def total(self) -> int:
        return sum(len(group.lines) for group in self.groups)


Sender = Callable[[DigestEmail], None]


def build_digest_groups(
    notifications: list[Notification],
    trip_name_by_id: dict[uuid.UUID, str],
) -> list[DigestTripGroup]:
    """Agrupa as Notificações por Viagem, preservando a ordem de aparição.

    `trip_name_by_id` resolve o nome da Viagem; sem entrada, cai em "Viagem".
    """
    lines_by_trip: dict[uuid.UUID, list[str]] = {}
    order: list[uuid.UUID] = []
    for notification in notifications:
        if notification.trip_id not in lines_by_trip:
            lines_by_trip[notification.trip_id] = []
            order.append(notification.trip_id)
        lines_by_trip[notification.trip_id].append(notification.text)
    return [
        DigestTripGroup(
            trip_id=trip_id,
            trip_name=trip_name_by_id.get(trip_id, "Viagem"),
            lines=lines_by_trip[trip_id],
        )
        for trip_id in order
    ]


def _default_sender(email: DigestEmail) -> None:
    from traveltogether.platform.email_service import send_digest_email  # noqa: PLC0415

    send_digest_email(
        to_email=email.recipient_email,
        recipient_name=email.recipient_name,
        groups=[(group.trip_name, group.lines) for group in email.groups],
        inbox_url=email.inbox_url,
    )


def run_digest(
    session: Session,
    *,
    send: Sender = _default_sender,
    now: datetime | None = None,
    web_base_url: str | None = None,
) -> list[uuid.UUID]:
    """Agrega Notificações não lidas por destinatário e manda um e-mail por pessoa.

    Só envia para quem tem a preferência `digest` ligada (ADR-0017) e só inclui
    Notificações criadas depois do último envio (marca d'água em `DigestState`),
    para não reenviar o que já foi mandado. Devolve os ids dos destinatários para
    quem um e-mail foi efetivamente enviado.
    """
    from traveltogether.identity.notification_prefs_service import (  # noqa: PLC0415
        get_notification_prefs,
    )
    from traveltogether.identity.service import get_users_by_ids  # noqa: PLC0415
    from traveltogether.trips.service import get_trips_by_ids  # noqa: PLC0415

    moment = now or datetime.now(UTC)
    base_url = (web_base_url or os.getenv("WEB_BASE_URL", _DEFAULT_WEB_BASE_URL)).rstrip("/")
    inbox_url = f"{base_url}/notifications"

    unread = list(
        session.exec(
            select(Notification)
            .where(Notification.read_at == None)  # noqa: E711 — SQL IS NULL
            .order_by(Notification.created_at)  # type: ignore[arg-type]
        ).all()
    )

    by_recipient: dict[uuid.UUID, list[Notification]] = {}
    for notification in unread:
        by_recipient.setdefault(notification.recipient_id, []).append(notification)

    # Mantém só os destinatários optados e com Notificações criadas após a marca d'água.
    fresh_by_recipient: dict[uuid.UUID, list[Notification]] = {}
    for recipient_id, notifications in by_recipient.items():
        if not get_notification_prefs(session, recipient_id).digest:
            continue
        watermark = session.get(DigestState, recipient_id)
        fresh = (
            notifications
            if watermark is None
            else [n for n in notifications if n.created_at > watermark.last_sent_at]
        )
        if fresh:
            fresh_by_recipient[recipient_id] = fresh

    if not fresh_by_recipient:
        return []

    recipient_ids = list(fresh_by_recipient)
    users = get_users_by_ids(session, recipient_ids)
    trip_ids = {n.trip_id for notifs in fresh_by_recipient.values() for n in notifs}
    trip_names = {tid: trip.name for tid, trip in get_trips_by_ids(session, list(trip_ids)).items()}

    emailed: list[uuid.UUID] = []
    for recipient_id in recipient_ids:
        user = users.get(recipient_id)
        if user is None:
            continue
        groups = build_digest_groups(fresh_by_recipient[recipient_id], trip_names)
        send(
            DigestEmail(
                recipient_id=recipient_id,
                recipient_email=user.email,
                recipient_name=user.display_name,
                groups=groups,
                inbox_url=inbox_url,
            )
        )
        _mark_sent(session, recipient_id, moment)
        emailed.append(recipient_id)

    return emailed


def _mark_sent(session: Session, recipient_id: uuid.UUID, moment: datetime) -> None:
    state = session.get(DigestState, recipient_id)
    if state is None:
        state = DigestState(recipient_id=recipient_id, last_sent_at=moment)
    else:
        state.last_sent_at = moment
    session.add(state)
    session.commit()
