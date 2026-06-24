"""Composition root do contexto identity (ADR-0005): um `provide_*` por use-case.

Centralizar o wiring por contexto (não por rota): quando um use-case ganhar um
Port novo, muda **um** provider, não N rotas. As rotas ficam declarativas
(`Depends(provide_…)`). O retorno anotado é onde pyright confere que cada adapter
satisfaz seu Port estruturalmente.

O pepper real entra na #196; aqui há um fallback de desenvolvimento (não-secreto)
para que tudo funcione sem segredo configurado — o gitleaks não barra.
"""

import os
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from travelmanager.identity.adapters.repository import SqlAlchemySessionRepository
from travelmanager.identity.adapters.tokens import SecretsTokenGenerator
from travelmanager.identity.application.use_cases import (
    CreateSession,
    ResolveSession,
    RevokeSession,
)
from travelmanager.shared.clock import SystemClock
from travelmanager.shared.db import get_db

# Fallback explícito e não-secreto: sem SESSION_PEPPER configurado, a sessão
# ainda funciona (degrada), e o gitleaks não barra. O pepper real vem na #196.
_DEV_PEPPER = "dev-insecure-session-pepper"


def session_pepper() -> str:
    """Pepper do HMAC da sessão; cai no fallback de dev quando não configurado."""
    return os.environ.get("SESSION_PEPPER") or _DEV_PEPPER


def provide_create_session(db: Annotated[Session, Depends(get_db)]) -> CreateSession:
    """Monta o use-case `CreateSession` para o request corrente."""
    return CreateSession(
        SqlAlchemySessionRepository(db), SystemClock(), SecretsTokenGenerator(), session_pepper()
    )


def provide_resolve_session(db: Annotated[Session, Depends(get_db)]) -> ResolveSession:
    """Monta o use-case `ResolveSession` para o request corrente."""
    return ResolveSession(SqlAlchemySessionRepository(db), SystemClock(), session_pepper())


def provide_revoke_session(db: Annotated[Session, Depends(get_db)]) -> RevokeSession:
    """Monta o use-case `RevokeSession` para o request corrente."""
    return RevokeSession(SqlAlchemySessionRepository(db), SystemClock())
