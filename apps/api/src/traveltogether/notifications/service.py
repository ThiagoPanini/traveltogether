"""Lógica de domínio do boundary notifications (Notificação — ADR-0017).

Núcleo: criar a Notificação por destinatário, listar/contar as do destinatário e
marcar lida(s). A entrega respeita as `Preferências de Notificação` do `Usuário`
(lidas via `identity.service`, nunca importando o modelo cross-boundary —
ADR-0014). Zero dependências de FastAPI.
"""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, select

from traveltogether.identity.notification_prefs_service import get_notification_prefs
from traveltogether.notifications.models import Notification, NotificationKind


class NotRecipient(Exception):
    """Levantada quando alguém tenta marcar uma Notificação que não é sua (invariante 20)."""


def _delivery_allowed(session: Session, recipient_id: uuid.UUID, kind: NotificationKind) -> bool:
    """`invite` sempre entrega; os demais respeitam o interruptor das prefs."""
    if kind == NotificationKind.invite:
        return True
    prefs = get_notification_prefs(session, recipient_id)
    return bool(getattr(prefs, kind.value))


def notify(
    session: Session,
    *,
    recipient_id: uuid.UUID,
    kind: NotificationKind,
    text: str,
    trip_id: uuid.UUID,
    target_type: str | None = None,
    target_id: uuid.UUID | None = None,
) -> Notification | None:
    """Cria a Notificação para o destinatário, se as prefs dele a permitirem.

    Retorna a Notificação criada, ou `None` quando as `Preferências de
    Notificação` suprimem o `kind`. `invite` é sempre entregue.
    """
    if not _delivery_allowed(session, recipient_id, kind):
        return None

    notification = Notification(
        recipient_id=recipient_id,
        kind=kind,
        text=text,
        trip_id=trip_id,
        target_type=target_type,
        target_id=target_id,
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


def list_for_user(session: Session, recipient_id: uuid.UUID) -> list[Notification]:
    """Notificações do destinatário, mais recentes primeiro (só as dele)."""
    return list(
        session.exec(
            select(Notification)
            .where(Notification.recipient_id == recipient_id)
            .order_by(Notification.created_at.desc())  # type: ignore[attr-defined]
        ).all()
    )


def mark_read(
    session: Session, notification: Notification, recipient_id: uuid.UUID
) -> Notification:
    """Marca a Notificação como lida (idempotente). Só o destinatário a marca."""
    if notification.recipient_id != recipient_id:
        raise NotRecipient("notification belongs to another user")
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        session.add(notification)
        session.commit()
        session.refresh(notification)
    return notification


def mark_all_read(session: Session, recipient_id: uuid.UUID) -> int:
    """Marca todas as não-lidas do destinatário como lidas. Retorna quantas mudaram."""
    now = datetime.now(UTC)
    unread = session.exec(
        select(Notification).where(
            Notification.recipient_id == recipient_id,
            Notification.read_at == None,  # noqa: E711 — SQL IS NULL
        )
    ).all()
    for notification in unread:
        notification.read_at = now
        session.add(notification)
    session.commit()
    return len(unread)


def count_unread(session: Session, recipient_id: uuid.UUID) -> int:
    """Quantas Notificações não-lidas o destinatário tem."""
    return len(
        list(
            session.exec(
                select(Notification).where(
                    Notification.recipient_id == recipient_id,
                    Notification.read_at == None,  # noqa: E711 — SQL IS NULL
                )
            ).all()
        )
    )
