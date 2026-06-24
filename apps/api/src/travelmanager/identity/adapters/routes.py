"""Adapter inbound: rotas e dependência de sessão (ADR-0011/0013).

A API admite contra o token opaco que o BFF repassa como `Bearer`. Aqui vivem a
dependency `get_current_session` (validação + kill-switch `is_active`) e as rotas
`/auth/me` e `/auth/logout`. O inbound **pode** falar HTTP (é a costura HTTP):
`get_current_session` levanta `HTTPException(401)` direto — "não autenticado" é
estado normal, não violação de regra. Provedores de auth (OTP, Google) chegam nas
fatias seguintes e reusam os use-cases de sessão.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status

from travelmanager.identity.adapters.dependencies import (
    provide_resolve_session,
    provide_revoke_session,
)
from travelmanager.identity.adapters.schemas import MeRead, ProfileRead, UserRead
from travelmanager.identity.application.use_cases import ResolveSession, RevokeSession
from travelmanager.identity.domain.models import AuthSession

router = APIRouter(prefix="/auth", tags=["auth"])


def _bearer_token(authorization: str | None) -> str | None:
    """Extrai o token de um header `Authorization: Bearer <token>`.

    Args:
        authorization: Valor cru do header (pode ser `None`).

    Returns:
        O token, ou `None` se ausente/mal-formado.
    """
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def get_current_session(
    resolve: Annotated[ResolveSession, Depends(provide_resolve_session)],
    authorization: Annotated[str | None, Header()] = None,
) -> AuthSession:
    """Resolve a sessão válida do Bearer corrente.

    Args:
        resolve: Use-case que valida o token opaco.
        authorization: Header `Authorization` cru.

    Returns:
        A sessão viva do usuário ativo.

    Raises:
        HTTPException: 401 se ausente, inválida ou usuário inativo (kill-switch).
    """
    token = _bearer_token(authorization)
    if token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "credencial ausente")
    session = resolve(token)
    if session is None or not session.user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "sessão inválida")
    return session


CurrentSession = Annotated[AuthSession, Depends(get_current_session)]


@router.get("/me", response_model=MeRead)
def me(session: CurrentSession) -> MeRead:
    """Quem é o usuário corrente, seu perfil e se ainda falta onboarding.

    Args:
        session: Sessão corrente resolvida pela dependency.

    Returns:
        O DTO `MeRead` com usuário, perfil e flag de onboarding.
    """
    user = session.user
    profile = user.profile
    needs_onboarding = profile is None or profile.onboarded_at is None
    return MeRead(
        user=UserRead.model_validate(user),
        profile=ProfileRead.model_validate(profile) if profile is not None else None,
        needs_onboarding=needs_onboarding,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    session: CurrentSession,
    revoke: Annotated[RevokeSession, Depends(provide_revoke_session)],
) -> Response:
    """Revoga a sessão corrente (o cookie é limpo no lado do web).

    Args:
        session: Sessão corrente resolvida pela dependency.
        revoke: Use-case de revogação.

    Returns:
        Resposta 204 sem corpo.
    """
    revoke(session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
