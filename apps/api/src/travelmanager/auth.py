"""Rotas e dependências de sessão (ADR-0011).

A API admite contra o token opaco que o BFF repassa como `Bearer`. Aqui vivem a
dependency `get_current_session` (validação + kill-switch `is_active`) e as
rotas `/auth/me` e `/auth/logout`. Provedores de auth (OTP, Google) chegam nas
fatias seguintes e reusam o "mint" de `sessions.py`.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from travelmanager.db import get_db
from travelmanager.models import AuthSession
from travelmanager.schemas import MeRead, ProfileRead, UserRead
from travelmanager.sessions import resolve_session, revoke_session

router = APIRouter(prefix="/auth", tags=["auth"])


def _bearer_token(authorization: str | None) -> str | None:
    """Extrai o token de um header `Authorization: Bearer <token>`."""
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def get_current_session(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> AuthSession:
    """Sessão válida do Bearer corrente; 401 se ausente, inválida ou usuário inativo."""
    token = _bearer_token(authorization)
    if token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "credencial ausente")
    session = resolve_session(db, token)
    if session is None or not session.user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "sessão inválida")
    return session


CurrentSession = Annotated[AuthSession, Depends(get_current_session)]


@router.get("/me", response_model=MeRead)
def me(session: CurrentSession) -> MeRead:
    """Quem é o usuário corrente, seu perfil e se ainda falta onboarding."""
    user = session.user
    profile = user.profile
    needs_onboarding = profile is None or profile.onboarded_at is None
    return MeRead(
        user=UserRead.model_validate(user),
        profile=ProfileRead.model_validate(profile) if profile is not None else None,
        needs_onboarding=needs_onboarding,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(session: CurrentSession, db: Annotated[Session, Depends(get_db)]) -> Response:
    """Revoga a sessão corrente (o cookie é limpo no lado do web)."""
    revoke_session(db, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
