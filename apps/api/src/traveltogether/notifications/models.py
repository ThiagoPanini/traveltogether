"""Modelos do boundary notifications (Notificação — ADR-0017).

`Notificação` é entidade persistida, **uma linha por destinatário**, com estado
lida/não-lida (`read_at`). Difere da `Atividade` (feed derivado, público, sem
destinatário) que vive em `trips`. As `Preferências de Notificação`
(`NotificationPrefs`) que filtram a entrega pertencem ao perfil do `Usuário` e
ficam no boundary `identity`.
"""

import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import ClassVar

from sqlmodel import Field, SQLModel


class NotificationKind(StrEnum):
    """Tipo do aviso (CONTEXT.md → `kind`).

    `invite` é sempre entregue (não tem interruptor); os demais respeitam as
    `Preferências de Notificação` do destinatário.
    """

    invite = "invite"
    decision = "decision"
    task = "task"
    mention = "mention"


class Notification(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "notifications"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    recipient_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    kind: NotificationKind
    trip_id: uuid.UUID = Field(foreign_key="trips.id")
    # Referência polimórfica opcional ao alvo dentro da Viagem (ADR-0014): o tipo
    # de alvo (ex.: "leg", "task", "comment") e seu id. `invite` aponta só à Viagem.
    target_type: str | None = Field(default=None)
    target_id: uuid.UUID | None = Field(default=None)
    text: str
    read_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class NotificationPublic(SQLModel):
    id: uuid.UUID
    kind: NotificationKind
    trip_id: uuid.UUID
    target_type: str | None
    target_id: uuid.UUID | None
    text: str
    read_at: datetime | None
    created_at: datetime


class NotificationInbox(SQLModel):
    """Inbox do destinatário: itens (mais recentes primeiro) + contador de não-lidas."""

    unread_count: int
    items: list[NotificationPublic]
