"""Primitivas de sessão opaca — o "mint" que OTP e Google vão reusar (ADR-0011).

A API cunha um token aleatório (opaco) e guarda só `HMAC-SHA256(token, pepper)`.
Validar é um lookup por hash que rejeita expirada/revogada. O pepper real entra
na #196; aqui há um fallback de desenvolvimento (não-secreto) para que tudo
funcione sem segredo configurado.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from travelmanager.models import AuthSession, User

DEFAULT_SESSION_TTL = timedelta(days=30)

# Fallback explícito e não-secreto: sem SESSION_PEPPER configurado, a sessão
# ainda funciona (degrada), e o gitleaks não barra. O pepper real vem na #196.
_DEV_PEPPER = "dev-insecure-session-pepper"


def get_session_pepper() -> str:
    """Pepper do HMAC da sessão; cai no fallback de dev quando não configurado."""
    return os.environ.get("SESSION_PEPPER") or _DEV_PEPPER


def generate_session_token() -> str:
    """Token opaco, aleatório e URL-safe — o segredo que viaja no cookie/Bearer."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str, pepper: str | None = None) -> str:
    """HMAC-SHA256(token, pepper) em hex — o que de fato é persistido."""
    key = (pepper if pepper is not None else get_session_pepper()).encode()
    return hmac.new(key, token.encode(), hashlib.sha256).hexdigest()


def _now() -> datetime:
    return datetime.now(UTC)


def _as_aware(moment: datetime) -> datetime:
    """Normaliza para UTC-aware (SQLite devolve naive; Postgres já vem aware)."""
    return moment if moment.tzinfo is not None else moment.replace(tzinfo=UTC)


def create_session(
    db: Session,
    user: User,
    *,
    user_agent: str | None = None,
    ttl: timedelta = DEFAULT_SESSION_TTL,
    pepper: str | None = None,
) -> tuple[AuthSession, str]:
    """Cria a sessão e devolve `(sessão, token_em_claro)`. O token cru só existe aqui."""
    token = generate_session_token()
    session = AuthSession(
        user_id=user.id,
        token_hash=hash_session_token(token, pepper),
        expires_at=_now() + ttl,
        user_agent=user_agent,
    )
    db.add(session)
    db.flush()
    return session, token


def resolve_session(db: Session, token: str, *, pepper: str | None = None) -> AuthSession | None:
    """Devolve a sessão válida do token, ou None se inexistente/expirada/revogada.

    Efeito colateral: marca `last_used_at` quando válida.
    """
    token_hash = hash_session_token(token, pepper)
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))
    if session is None or session.revoked_at is not None:
        return None
    if _as_aware(session.expires_at) <= _now():
        return None
    session.last_used_at = _now()
    db.flush()
    return session


def revoke_session(db: Session, session: AuthSession) -> None:
    """Revoga a sessão (idempotente para o que importa: ela deixa de validar)."""
    session.revoked_at = _now()
    db.flush()
