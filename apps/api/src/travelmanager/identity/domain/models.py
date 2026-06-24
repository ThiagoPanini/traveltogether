"""Modelos ORM de identidade (SQLAlchemy 2.0) — as entidades do contexto.

No padrão pragmático (ADR-0005) o **modelo ORM é a entidade**: comportamento que
fala sobre o próprio estado mora como método aqui (ex.: `AuthSession.is_valid_at`).
Persistência separada do contrato (ADR-0005): aqui só a forma das tabelas; os
schemas Pydantic que viajam na API vivem em `adapters/schemas.py`. A topologia que
estreia estes modelos está em ADR-0004 — a API é a autoridade de identidade,
e-mail é a chave natural, a sessão é opaca (guardada como hash).

A `Base` mora em `shared/db.py`; o `alembic/env.py` importa este módulo para que as
tabelas registrem em `Base.metadata`.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from travelmanager.shared.db import Base


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


def _as_aware(moment: datetime) -> datetime:
    """Normaliza para UTC-aware (SQLite devolve naive; Postgres já vem aware)."""
    return moment if moment.tzinfo is not None else moment.replace(tzinfo=UTC)


class User(Base):
    """Pessoa com conta própria. E-mail é a chave natural (lowercased, único)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    profile: Mapped[Profile | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    sessions: Mapped[list[AuthSession]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    identities: Mapped[list[AuthIdentity]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Profile(Base):
    """Perfil 1:1 do Usuário; `onboarded_at` nulo enquanto falta onboarding (CONTEXT inv. 6)."""

    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    display_name: Mapped[str | None] = mapped_column(String(120), default=None)
    country: Mapped[str | None] = mapped_column(String(2), default=None)
    origin_city: Mapped[str | None] = mapped_column(String(120), default=None)
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="profile")


class AuthSession(Base):
    """Sessão opaca cunhada pela API: só o HMAC do token é persistido (ADR-0004)."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    user_agent: Mapped[str | None] = mapped_column(String(400), default=None)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = _created_at()

    user: Mapped[User] = relationship(back_populates="sessions")

    def is_valid_at(self, moment: datetime) -> bool:
        """Diz se a sessão vale no instante dado.

        Args:
            moment: Instante de referência (timezone-aware).

        Returns:
            `True` quando não revogada e ainda não expirada; `False` caso
            contrário.
        """
        return self.revoked_at is None and _as_aware(self.expires_at) > moment


class OtpCode(Base):
    """Código OTP chaveado por e-mail (não por user): pedir código não exige conta."""

    __tablename__ = "otp_codes"

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String(320), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = _created_at()

    def is_redeemable_at(self, moment: datetime) -> bool:
        """Diz se o código pode ser resgatado no instante dado.

        Args:
            moment: Instante de referência (timezone-aware).

        Returns:
            `True` quando não consumido e ainda não expirado; `False` caso
            contrário.
        """
        return self.consumed_at is None and _as_aware(self.expires_at) > moment


class RateEvent(Base):
    """Evento de uso para rate-limit DB-backed (#194): hits por `(scope, key)` em janelas.

    Sem Redis no stack (ADR-0004): a contagem de eventos numa janela decide o bloqueio.
    `occurred_at` é o instante **lógico** do evento (vindo do `Clock`), gravado em
    naive-UTC para que a contagem em janela seja uniforme entre o SQLite dos testes e o
    Postgres. Append-only; varrer eventos velhos fica para manutenção futura.
    """

    __tablename__ = "rate_events"
    __table_args__ = (Index("ix_rate_events_scope_key_time", "scope", "key", "occurred_at"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    scope: Mapped[str] = mapped_column(String(40))
    key: Mapped[str] = mapped_column(String(320))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=False))


class AuthIdentity(Base):
    """Vínculo de provedor externo ao Usuário; `(provider, subject)` é único."""

    __tablename__ = "auth_identities"
    __table_args__ = (UniqueConstraint("provider", "subject", name="uq_provider_subject"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(40))
    subject: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(320))
    created_at: Mapped[datetime] = _created_at()

    user: Mapped[User] = relationship(back_populates="identities")
