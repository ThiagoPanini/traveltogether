"""Adapter inbound: rotas e dependência de sessão (ADR-0004/0005).

A API admite contra o token opaco que o BFF repassa como `Bearer`. Aqui vivem a
dependency `get_current_session` (validação + kill-switch `is_active`) e as rotas
`/auth/me` e `/auth/logout`. O inbound **pode** falar HTTP (é a costura HTTP):
`get_current_session` levanta `HTTPException(401)` direto — "não autenticado" é
estado normal, não violação de regra. Provedores de auth (OTP, Google) chegam nas
fatias seguintes e reusam os use-cases de sessão.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status

from travelmanager.identity.adapters.dependencies import (
    provide_complete_onboarding,
    provide_request_otp,
    provide_resolve_session,
    provide_revoke_all_sessions,
    provide_revoke_session,
    provide_sign_in_with_google,
    provide_verify_otp,
)
from travelmanager.identity.adapters.schemas import (
    GoogleVerifyIn,
    MeRead,
    OtpRequestIn,
    OtpVerifyIn,
    ProfileIn,
    ProfileRead,
    SessionGrant,
    UserRead,
)
from travelmanager.identity.application.use_cases import (
    CompleteOnboarding,
    RequestOtp,
    ResolveSession,
    RevokeAllSessions,
    RevokeSession,
    SignInWithGoogle,
    VerifyOtp,
)
from travelmanager.identity.domain.models import AuthSession, User

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    """Descobre o IP do cliente para o rate-limit por origem (#194).

    A API é interna (ADR-0004): o BFF é quem fala com o cliente, então o IP real
    chega no `X-Forwarded-For` (primeiro hop). Sem ele, cai no peer da conexão.

    Args:
        request: Request HTTP corrente.

    Returns:
        O IP do cliente, ou `None` se indeterminado.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


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


def _me_read(user: User) -> MeRead:
    """Monta o DTO `MeRead` a partir do usuário e seu perfil.

    Args:
        user: Usuário resolvido (com `profile` carregado, se houver).

    Returns:
        O DTO com usuário, perfil e flag de onboarding (perfil ausente ou sem
        `onboarded_at` ⇒ falta onboarding).
    """
    profile = user.profile
    needs_onboarding = profile is None or profile.onboarded_at is None
    return MeRead(
        user=UserRead.model_validate(user),
        profile=ProfileRead.model_validate(profile) if profile is not None else None,
        needs_onboarding=needs_onboarding,
    )


@router.get("/me", response_model=MeRead)
def me(session: CurrentSession) -> MeRead:
    """Quem é o usuário corrente, seu perfil e se ainda falta onboarding.

    Args:
        session: Sessão corrente resolvida pela dependency.

    Returns:
        O DTO `MeRead` com usuário, perfil e flag de onboarding.
    """
    return _me_read(session.user)


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


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(
    session: CurrentSession,
    revoke_all: Annotated[RevokeAllSessions, Depends(provide_revoke_all_sessions)],
) -> Response:
    """Logout global: revoga todas as sessões do usuário corrente (#194).

    Derruba todos os dispositivos de uma vez; o token corrente também para de valer.

    Args:
        session: Sessão corrente resolvida pela dependency (identifica o usuário).
        revoke_all: Use-case de revogação global.

    Returns:
        Resposta 204 sem corpo.
    """
    revoke_all(session.user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/otp/request", status_code=status.HTTP_202_ACCEPTED)
def otp_request(
    payload: OtpRequestIn,
    request: Request,
    request_otp: Annotated[RequestOtp, Depends(provide_request_otp)],
) -> Response:
    """Passo 1: emite um código OTP para o e-mail e dispara o transporte.

    Anti-enumeração (ADR-0004): responde sempre 202, exista ou não conta — não
    revela quem já tem cadastro. Rate-limit por e-mail/IP/global (#194): estourar
    levanta `RateLimited` (→ 429) **sem** gerar código.

    Args:
        payload: Corpo com o e-mail.
        request: Request HTTP corrente (de onde sai o IP do cliente).
        request_otp: Use-case que gera, persiste e envia o código sob rate-limit.

    Returns:
        Resposta 202 sem corpo (o código nunca trafega na resposta).

    Raises:
        RateLimited: cooldown ativo ou teto por e-mail/IP/global estourado (→ 429).
    """
    request_otp(payload.email, ip=_client_ip(request))
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.post("/otp/verify", response_model=SessionGrant)
def otp_verify(
    payload: OtpVerifyIn,
    verify_otp: Annotated[VerifyOtp, Depends(provide_verify_otp)],
    user_agent: Annotated[str | None, Header()] = None,
) -> SessionGrant:
    """Passo 2: valida o código e cunha a sessão (token devolvido ao BFF).

    Args:
        payload: Corpo com e-mail e código.
        verify_otp: Use-case que valida o OTP e reusa o mint de sessão.
        user_agent: User-Agent do cliente, repassado à sessão.

    Returns:
        `SessionGrant` com usuário, flag de onboarding e o token opaco de sessão.

    Raises:
        Unauthorized: código inexistente, errado, expirado ou já consumido (→ 401).
    """
    user, token, needs_onboarding = verify_otp(payload.email, payload.code, user_agent=user_agent)
    return SessionGrant(
        user=UserRead.model_validate(user),
        needs_onboarding=needs_onboarding,
        session_token=token,
    )


@router.post("/google", response_model=SessionGrant)
def google_sign_in(
    payload: GoogleVerifyIn,
    sign_in: Annotated[SignInWithGoogle, Depends(provide_sign_in_with_google)],
    user_agent: Annotated[str | None, Header()] = None,
) -> SessionGrant:
    """Verifica o `id_token` do Google e cunha a sessão (token devolvido ao BFF).

    Args:
        payload: Corpo com o `id_token` obtido na dança OAuth do web.
        sign_in: Use-case que verifica a prova, resolve o usuário e reusa o mint.
        user_agent: User-Agent do cliente, repassado à sessão.

    Returns:
        `SessionGrant` com usuário, flag de onboarding e o token opaco de sessão.

    Raises:
        Unauthorized: `id_token` inválido ou e-mail não verificado pelo Google (→ 401).
    """
    user, token, needs_onboarding = sign_in(payload.id_token, user_agent=user_agent)
    return SessionGrant(
        user=UserRead.model_validate(user),
        needs_onboarding=needs_onboarding,
        session_token=token,
    )


@router.post("/profile", response_model=MeRead)
def complete_profile(
    payload: ProfileIn,
    session: CurrentSession,
    complete: Annotated[CompleteOnboarding, Depends(provide_complete_onboarding)],
) -> MeRead:
    """Grava o Perfil do onboarding e devolve o `MeRead` já com `needs_onboarding` falso.

    A sessão tem de existir (a dependency barra com 401 se ausente). O use-case valida
    os campos obrigatórios e carimba `onboarded_at`.

    Args:
        payload: Nome de exibição, cidade de origem e país.
        session: Sessão corrente (dono do Perfil).
        complete: Use-case que grava o Perfil e encerra o onboarding.

    Returns:
        O `MeRead` atualizado (perfil gravado, `needs_onboarding` falso).

    Raises:
        Invalid: nome, cidade de origem ou país em branco (→ 422).
    """
    user = complete(
        session.user,
        display_name=payload.display_name,
        origin_city=payload.origin_city,
        country=payload.country,
    )
    return _me_read(user)
