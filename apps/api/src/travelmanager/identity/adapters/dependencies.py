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

from travelmanager.identity.adapters.codes import SecretsCodeGenerator
from travelmanager.identity.adapters.email import DevEmailSender, ResendEmailSender
from travelmanager.identity.adapters.google import GoogleIdTokenVerifier
from travelmanager.identity.adapters.repository import (
    SqlAlchemyIdentityRepository,
    SqlAlchemyOtpRepository,
    SqlAlchemyRateLimiter,
    SqlAlchemySessionRepository,
    SqlAlchemyUserRepository,
)
from travelmanager.identity.adapters.tokens import SecretsTokenGenerator
from travelmanager.identity.application.ports import (
    CodeGenerator,
    EmailSender,
    GoogleTokenVerifier,
    RateLimiter,
)
from travelmanager.identity.application.use_cases import (
    CompleteOnboarding,
    CreateSession,
    RequestOtp,
    ResolveSession,
    RevokeAllSessions,
    RevokeSession,
    SignInWithGoogle,
    VerifyOtp,
)
from travelmanager.shared.clock import SystemClock
from travelmanager.shared.db import get_db

# Fallbacks explícitos e não-secretos: sem os peppers configurados, sessão e OTP
# ainda funcionam (degrada), e o gitleaks não barra. Os peppers reais vêm na #196.
_DEV_PEPPER = "dev-insecure-session-pepper"
_DEV_OTP_PEPPER = "dev-insecure-otp-pepper"


def session_pepper() -> str:
    """Pepper do HMAC da sessão; cai no fallback de dev quando não configurado."""
    return os.environ.get("SESSION_PEPPER") or _DEV_PEPPER


def otp_pepper() -> str:
    """Pepper do HMAC do OTP; cai no fallback de dev quando não configurado."""
    return os.environ.get("OTP_PEPPER") or _DEV_OTP_PEPPER


def provide_code_generator() -> CodeGenerator:
    """Gerador de código OTP (sobrescrevível por um fixo nos testes)."""
    return SecretsCodeGenerator()


def provide_email_sender() -> EmailSender:
    """Transporte de e-mail: Resend quando há `RESEND_API_KEY`, senão o dev (log).

    Sem a chave, o app **não quebra** — usa o transporte dev (#190); o Resend é
    ligado no go-live (#196).
    """
    api_key = os.environ.get("RESEND_API_KEY")
    if api_key:
        return ResendEmailSender(api_key, os.environ.get("EMAIL_FROM", ""))
    return DevEmailSender()


def google_client_id() -> str:
    """O `GOOGLE_CLIENT_ID` esperado em `aud`; vazio quando não configurado.

    Sem fallback de dev: não há como falsificar uma prova do Google. Sem o client_id
    real (entra na #196), o verificador rejeita tudo e o web nem expõe o botão.
    """
    return os.environ.get("GOOGLE_CLIENT_ID", "")


def provide_google_verifier() -> GoogleTokenVerifier:
    """Verificador de `id_token` do Google (sobrescrevível por um fake nos testes)."""
    return GoogleIdTokenVerifier(google_client_id())


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


def provide_revoke_all_sessions(db: Annotated[Session, Depends(get_db)]) -> RevokeAllSessions:
    """Monta o use-case `RevokeAllSessions` (logout global) para o request corrente."""
    return RevokeAllSessions(SqlAlchemySessionRepository(db), SystemClock())


def provide_rate_limiter(db: Annotated[Session, Depends(get_db)]) -> RateLimiter:
    """Limitador DB-backed do request corrente (sobrescrevível por um fake nos testes)."""
    return SqlAlchemyRateLimiter(db)


def provide_request_otp(
    db: Annotated[Session, Depends(get_db)],
    codes: Annotated[CodeGenerator, Depends(provide_code_generator)],
    email_sender: Annotated[EmailSender, Depends(provide_email_sender)],
    rate_limiter: Annotated[RateLimiter, Depends(provide_rate_limiter)],
) -> RequestOtp:
    """Monta o use-case `RequestOtp` (com rate-limit) para o request corrente."""
    return RequestOtp(
        SqlAlchemyOtpRepository(db), SystemClock(), codes, email_sender, rate_limiter, otp_pepper()
    )


def provide_verify_otp(db: Annotated[Session, Depends(get_db)]) -> VerifyOtp:
    """Monta o use-case `VerifyOtp` (reusa o mint de sessão) para o request corrente."""
    create_session = CreateSession(
        SqlAlchemySessionRepository(db), SystemClock(), SecretsTokenGenerator(), session_pepper()
    )
    return VerifyOtp(
        SqlAlchemyOtpRepository(db),
        SqlAlchemyUserRepository(db),
        create_session,
        SystemClock(),
        otp_pepper(),
    )


def provide_sign_in_with_google(
    db: Annotated[Session, Depends(get_db)],
    verifier: Annotated[GoogleTokenVerifier, Depends(provide_google_verifier)],
) -> SignInWithGoogle:
    """Monta o use-case `SignInWithGoogle` (reusa o mint de sessão) para o request."""
    create_session = CreateSession(
        SqlAlchemySessionRepository(db), SystemClock(), SecretsTokenGenerator(), session_pepper()
    )
    return SignInWithGoogle(
        verifier,
        SqlAlchemyUserRepository(db),
        SqlAlchemyIdentityRepository(db),
        create_session,
        SystemClock(),
    )


def provide_complete_onboarding(db: Annotated[Session, Depends(get_db)]) -> CompleteOnboarding:
    """Monta o use-case `CompleteOnboarding` para o request corrente."""
    return CompleteOnboarding(SqlAlchemyUserRepository(db), SystemClock())
