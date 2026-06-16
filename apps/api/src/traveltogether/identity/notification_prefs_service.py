"""Preferências de Notificação do Usuário (ADR-0017).

Vivem no perfil (`identity`), não na `Viagem`. O boundary `notifications` lê
estas prefs via este service (chamada service→service, ADR-0014) para filtrar a
entrega. Ausência de linha = padrão (tudo ligado, digest desligado).
"""

import uuid

from sqlmodel import Session

from traveltogether.identity.models import NotificationPrefs


def get_notification_prefs(session: Session, user_id: uuid.UUID) -> NotificationPrefs:
    """Prefs do Usuário; devolve o padrão (sem persistir) se ainda não houver linha."""
    prefs = session.get(NotificationPrefs, user_id)
    if prefs is None:
        return NotificationPrefs(user_id=user_id)
    return prefs


def update_notification_prefs(
    session: Session,
    user_id: uuid.UUID,
    *,
    decision: bool | None = None,
    task: bool | None = None,
    mention: bool | None = None,
    digest: bool | None = None,
) -> NotificationPrefs:
    """Atualização parcial das prefs (cria a linha no primeiro toque). ``None`` mantém."""
    prefs = session.get(NotificationPrefs, user_id)
    if prefs is None:
        prefs = NotificationPrefs(user_id=user_id)
    if decision is not None:
        prefs.decision = decision
    if task is not None:
        prefs.task = task
    if mention is not None:
        prefs.mention = mention
    if digest is not None:
        prefs.digest = digest
    session.add(prefs)
    session.commit()
    session.refresh(prefs)
    return prefs
