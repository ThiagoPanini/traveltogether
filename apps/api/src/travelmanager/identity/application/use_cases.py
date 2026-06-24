"""Use-cases de sessão e OTP (ADR-0005): o "mint" que OTP e Google reusam (ADR-0004).

Cada use-case é um `@dataclass(frozen=True, slots=True)` callable: os Ports entram
como campos no composition-time, e a borda chama só `use_case(args)`. A política
de sessão (TTL, `last_used_at`, revogação) e a de OTP (geração, TTL, consumo único)
vivem aqui; a persistência fica atrás dos repositórios; o tempo, atrás do `Clock`;
o envio, atrás do `EmailSender`. Nenhuma linha de HTTP nem de SQLAlchemy.

O kill-switch `is_active` **não** mora em `ResolveSession`: "não autenticado" e
"usuário desativado" colapsam num 401 e são decididos no inbound
(`get_current_session`), preservando o comportamento da #189.
"""

from dataclasses import dataclass
from datetime import timedelta

from travelmanager.identity.application.ports import (
    CodeGenerator,
    EmailSender,
    GoogleTokenVerifier,
    IdentityRepository,
    OtpRepository,
    SessionRepository,
    TokenGenerator,
    UserRepository,
)
from travelmanager.identity.domain.models import AuthIdentity, AuthSession, OtpCode, User
from travelmanager.identity.domain.rules import hash_otp_code, hash_session_token, normalize_email
from travelmanager.shared.clock import Clock
from travelmanager.shared.errors import Unauthorized

DEFAULT_SESSION_TTL = timedelta(days=30)
OTP_TTL = timedelta(minutes=10)
GOOGLE_PROVIDER = "google"


@dataclass(frozen=True, slots=True)
class CreateSession:
    """Cunha uma sessão opaca para um usuário."""

    sessions: SessionRepository
    clock: Clock
    tokens: TokenGenerator
    pepper: str

    def __call__(
        self,
        user: User,
        *,
        user_agent: str | None = None,
        ttl: timedelta = DEFAULT_SESSION_TTL,
    ) -> tuple[AuthSession, str]:
        """Cria a sessão e devolve `(sessão, token_em_claro)`.

        O token cru só existe aqui e no retorno; o banco guarda apenas o hash.

        Args:
            user: Dono da sessão.
            user_agent: User-Agent do cliente, se conhecido.
            ttl: Tempo de vida da sessão.

        Returns:
            A sessão persistida e o token em claro.
        """
        token = self.tokens.generate()
        session = AuthSession(
            user_id=user.id,
            token_hash=hash_session_token(token, self.pepper),
            expires_at=self.clock.now() + ttl,
            user_agent=user_agent,
        )
        self.sessions.save(session)
        return session, token


@dataclass(frozen=True, slots=True)
class ResolveSession:
    """Resolve o token opaco na sessão válida correspondente."""

    sessions: SessionRepository
    clock: Clock
    pepper: str

    def __call__(self, raw_token: str) -> AuthSession | None:
        """Devolve a sessão válida do token, marcando o uso.

        Args:
            raw_token: Token opaco em claro vindo do Bearer.

        Returns:
            A sessão quando viva (não expirada e não revogada), ou `None` se
            inexistente/expirada/revogada. Quando viva, persiste `last_used_at`.
        """
        session = self.sessions.get_by_token_hash(hash_session_token(raw_token, self.pepper))
        now = self.clock.now()
        if session is None or not session.is_valid_at(now):
            return None
        session.last_used_at = now
        self.sessions.save(session)
        return session


@dataclass(frozen=True, slots=True)
class RevokeSession:
    """Revoga uma sessão (logout / kill-switch)."""

    sessions: SessionRepository
    clock: Clock

    def __call__(self, session: AuthSession) -> None:
        """Marca a sessão como revogada e persiste o efeito.

        Args:
            session: A sessão a revogar.
        """
        session.revoked_at = self.clock.now()
        self.sessions.save(session)


@dataclass(frozen=True, slots=True)
class RequestOtp:
    """Gera um código OTP para um e-mail, persiste o hash e dispara o transporte."""

    otps: OtpRepository
    clock: Clock
    codes: CodeGenerator
    email_sender: EmailSender
    pepper: str
    ttl: timedelta = OTP_TTL

    def __call__(self, email: str) -> None:
        """Emite um código novo para o e-mail.

        Pedir código não exige conta (OTP é chaveado por e-mail). O código cru só
        existe aqui e no envio; o banco guarda apenas o HMAC.

        Args:
            email: E-mail destino, como digitado (normalizado aqui).
        """
        normalized = normalize_email(email)
        code = self.codes.generate()
        self.otps.save(
            OtpCode(
                email=normalized,
                code_hash=hash_otp_code(code, self.pepper),
                expires_at=self.clock.now() + self.ttl,
            )
        )
        self.email_sender.send_code(normalized, code)


@dataclass(frozen=True, slots=True)
class VerifyOtp:
    """Valida o código OTP e cunha a sessão, resolvendo o usuário pelo e-mail."""

    otps: OtpRepository
    users: UserRepository
    create_session: CreateSession
    clock: Clock
    pepper: str

    def __call__(
        self, email: str, code: str, *, user_agent: str | None = None
    ) -> tuple[User, str, bool]:
        """Verifica o código e devolve `(usuário, token_em_claro, falta_onboarding)`.

        Código certo dentro do TTL: consome o OTP, resolve-ou-cria o usuário (e-mail
        é a chave natural; o OTP comprova posse, então carimba `email_verified_at`),
        e reusa `CreateSession` para o mint. Qualquer outro caminho levanta
        `Unauthorized` e **não** autentica.

        Args:
            email: E-mail do passo 1, como digitado (normalizado aqui).
            code: Código de 6 dígitos digitado no passo 2.
            user_agent: User-Agent do cliente, repassado à sessão.

        Returns:
            O usuário resolvido, o token de sessão em claro e se ainda falta
            onboarding (perfil ausente ou sem `onboarded_at`).

        Raises:
            Unauthorized: código inexistente, errado, expirado ou já consumido.
        """
        normalized = normalize_email(email)
        now = self.clock.now()
        otp = self.otps.get_active(normalized, now)
        if otp is None or otp.code_hash != hash_otp_code(code, self.pepper):
            raise Unauthorized("código inválido ou expirado")
        otp.consumed_at = now
        self.otps.save(otp)

        user = self.users.get_by_email(normalized)
        if user is None:
            user = User(email=normalized, email_verified_at=now)
            self.users.save(user)
        elif user.email_verified_at is None:
            user.email_verified_at = now
            self.users.save(user)

        _, token = self.create_session(user, user_agent=user_agent)
        needs_onboarding = user.profile is None or user.profile.onboarded_at is None
        return user, token, needs_onboarding


@dataclass(frozen=True, slots=True)
class SignInWithGoogle:
    """Verifica o `id_token` do Google, resolve o usuário e cunha a sessão."""

    verifier: GoogleTokenVerifier
    users: UserRepository
    identities: IdentityRepository
    create_session: CreateSession
    clock: Clock

    def __call__(self, id_token: str, *, user_agent: str | None = None) -> tuple[User, str, bool]:
        """Admite via Google e devolve `(usuário, token_em_claro, falta_onboarding)`.

        Token válido com e-mail verificado: resolve o usuário pela chave natural
        (e-mail; ADR-0004), criando-o se novo e carimbando `email_verified_at` (o
        Google atesta a posse), registra o vínculo `(google, subject)` uma vez, e
        reusa `CreateSession` para o mint. Token recusado ou e-mail não-verificado
        levanta `Unauthorized` e **não** autentica.

        O happy path aqui é o **usuário novo**; o caminho de vínculo a uma conta
        e-mail pré-existente por outra porta é endurecido na fatia #195.

        Args:
            id_token: O JWT cru vindo da dança OAuth (repassado pelo BFF).
            user_agent: User-Agent do cliente, repassado à sessão.

        Returns:
            O usuário resolvido, o token de sessão em claro e se ainda falta
            onboarding (perfil ausente ou sem `onboarded_at`).

        Raises:
            Unauthorized: token inválido (assinatura/`aud`/`exp`) ou e-mail não
                verificado pelo Google.
        """
        claims = self.verifier.verify(id_token)
        if claims is None:
            raise Unauthorized("token do Google inválido")
        if not claims.email_verified:
            raise Unauthorized("e-mail do Google não verificado")

        now = self.clock.now()
        identity = self.identities.get_by_provider_subject(GOOGLE_PROVIDER, claims.subject)
        if identity is not None:
            user = identity.user
        else:
            email = normalize_email(claims.email)
            user = self.users.get_by_email(email)
            if user is None:
                user = User(email=email, email_verified_at=now)
                self.users.save(user)
            elif user.email_verified_at is None:
                user.email_verified_at = now
                self.users.save(user)
            self.identities.save(
                AuthIdentity(
                    user=user, provider=GOOGLE_PROVIDER, subject=claims.subject, email=email
                )
            )

        _, token = self.create_session(user, user_agent=user_agent)
        needs_onboarding = user.profile is None or user.profile.onboarded_at is None
        return user, token, needs_onboarding
