"""Rotas HTTP do boundary notifications (Notificação — ADR-0017).

Inbox e prefs do **próprio** destinatário (`/me/...`); só ele lê e marca as suas
(invariante 20). Sem regra de domínio aqui — autorização implícita pelo
`current_user` e tradução HTTP. As prefs vivem em `identity`.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import (
    NotificationPrefsPublic,
    NotificationPrefsUpdate,
    User,
)
from traveltogether.identity.notification_prefs_service import (
    get_notification_prefs,
    update_notification_prefs,
)
from traveltogether.notifications.models import (
    Notification,
    NotificationInbox,
    NotificationPublic,
)
from traveltogether.notifications.service import (
    NotRecipient,
    count_unread,
    list_for_user,
    mark_all_read,
    mark_read,
)
from traveltogether.platform.db import get_session

router = APIRouter(tags=["notifications"])


@router.get("/me/notifications", response_model=NotificationInbox)
def get_my_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> NotificationInbox:
    """Inbox do Usuário: notificações (recentes primeiro) + contador de não-lidas."""
    items = list_for_user(session, current_user.id)
    return NotificationInbox(
        unread_count=count_unread(session, current_user.id),
        items=[NotificationPublic.model_validate(item) for item in items],
    )


def _get_own_notification_or_404(
    session: Session, notification_id: uuid.UUID, user: User
) -> Notification:
    notification = session.get(Notification, notification_id)
    if notification is None or notification.recipient_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="notification not found")
    return notification


@router.post("/me/notifications/{notification_id}/read", response_model=NotificationPublic)
def post_mark_read(
    notification_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Notification:
    """Marca uma Notificação como lida (idempotente)."""
    notification = _get_own_notification_or_404(session, notification_id, current_user)
    try:
        return mark_read(session, notification, current_user.id)
    except NotRecipient as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/me/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def post_mark_all_read(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    """Marca todas as não-lidas do Usuário como lidas."""
    mark_all_read(session, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/notification-prefs", response_model=NotificationPrefsPublic)
def get_my_prefs(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> NotificationPrefsPublic:
    """Preferências de Notificação do Usuário (padrão se ainda não tocadas)."""
    prefs = get_notification_prefs(session, current_user.id)
    return NotificationPrefsPublic.model_validate(prefs)


@router.put("/me/notification-prefs", response_model=NotificationPrefsPublic)
def put_my_prefs(
    body: NotificationPrefsUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> NotificationPrefsPublic:
    """Atualização parcial das prefs do Usuário."""
    prefs = update_notification_prefs(
        session,
        current_user.id,
        decision=body.decision,
        task=body.task,
        mention=body.mention,
        digest=body.digest,
    )
    return NotificationPrefsPublic.model_validate(prefs)
