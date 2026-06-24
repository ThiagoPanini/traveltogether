"""Use-cases de sessão e OTP (ADR-0005): o "mint" que OTP e Google reusam (ADR-0004).

Cada use-case é um `@dataclass(frozen=True, slots=True)` callable: os Ports entram
como campos no composition-time, e a borda chama só `use_case(args)`. A política
de sessão (TTL, `last_used_at`, revogação) e a de OTP (geração, TTL, consumo único)
vivem aqui; a persistência fica atrás dos repositórios; o tempo, atrás do `Clock`;
o envio, atrás do `EmailSender`. Nenhuma linha de HTTP nem de SQLAlchemy.

O kill-switch `is_active` **não** mora em `ResolveSession`: na validação de sessão,
"não autenticado" e "usuário desativado" colapsam num 401 decidido no inbound
(`get_current_session`), preservando o comportamento da #189. No **login** (OTP e
Google), porém, a conta desativada é barrada aqui mesmo (`Unauthorized`), antes de
cunhar sessão ou registrar vínculo — não há porta de entrada para conta morta (#194).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from travelmanager.identity.application.ports import (
    CodeGenerator,
    EmailSender,
    GoogleTokenVerifier,
    IdentityRepository,
    OtpRepository,
    RateLimiter,
    SessionRepository,
    TokenGenerator,
    UserRepository,
)
from travelmanager.identity.domain.models import AuthIdentity, AuthSession, OtpCode, Profile, User
from travelmanager.identity.domain.rules import hash_otp_code, hash_session_token, normalize_email
from travelmanager.shared.clock import Clock
from travelmanager.shared.errors import Invalid, RateLimited, Unauthorized

DEFAULT_SESSION_TTL = timedelta(days=30)
OTP_TTL = timedelta(minutes=10)
GOOGLE_PROVIDER = "google"

# Teto de tentativas erradas por código antes de invalidá-lo (anti brute-force, #194).
MAX_OTP_ATTEMPTS = 5

# Anti-spam do pedido de OTP (DB-backed, #194): cada pedido registra um evento por
# escopo; a contagem em janela decide o bloqueio. Cooldown estreito por e-mail, teto
# por hora por e-mail e por IP, e um teto global como amortecedor anti-flood.
OTP_RESEND_COOLDOWN = timedelta(seconds=30)
OTP_EMAIL_WINDOW = timedelta(hours=1)
OTP_EMAIL_CAP = 5
OTP_IP_WINDOW = timedelta(hours=1)
OTP_IP_CAP = 20
OTP_GLOBAL_WINDOW = timedelta(hours=1)
OTP_GLOBAL_CAP = 500

SCOPE_OTP_EMAIL = "otp:email"
SCOPE_OTP_IP = "otp:ip"
SCOPE_OTP_GLOBAL = "otp:global"
GLOBAL_KEY = "*"


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
class RevokeAllSessions:
    """Revoga **todas** as sessões vivas de um usuário (logout global / kill-switch)."""

    sessions: SessionRepository
    clock: Clock

    def __call__(self, user: User) -> int:
        """Carimba `revoked_at` em cada sessão não-revogada do usuário.

        É o "logout de todos os dispositivos" e o braço de força do kill-switch
        (ADR-0004: sessão opaca revogável por-dispositivo **e** global). Após isto,
        nenhum token antigo resolve em `ResolveSession`.

        Args:
            user: Dono das sessões a derrubar.

        Returns:
            Quantas sessões foram revogadas.
        """
        now = self.clock.now()
        active = self.sessions.active_for_user(user.id)
        for session in active:
            session.revoked_at = now
            self.sessions.save(session)
        return len(active)


@dataclass(frozen=True, slots=True)
class RequestOtp:
    """Gera um código OTP para um e-mail, persiste o hash e dispara o transporte."""

    otps: OtpRepository
    clock: Clock
    codes: CodeGenerator
    email_sender: EmailSender
    rate_limiter: RateLimiter
    pepper: str
    ttl: timedelta = OTP_TTL

    def __call__(self, email: str, *, ip: str | None = None) -> None:
        """Emite um código novo para o e-mail, sob rate-limit (#194).

        Pedir código não exige conta (OTP é chaveado por e-mail) — anti-enumeração se
        mantém: o caminho é idêntico exista ou não a conta. O código cru só existe
        aqui e no envio; o banco guarda apenas o HMAC. Antes de gerar, o cooldown e os
        tetos por e-mail/IP/global são checados; estourar qualquer um levanta
        `RateLimited` **sem** gerar código (anti-spam).

        Args:
            email: E-mail destino, como digitado (normalizado aqui).
            ip: IP do cliente (repassado pelo BFF), se conhecido — limite por origem.

        Raises:
            RateLimited: cooldown ativo ou teto por e-mail/IP/global estourado.
        """
        normalized = normalize_email(email)
        now = self.clock.now()
        self._enforce_limits(normalized, ip, now)
        code = self.codes.generate()
        self.otps.save(
            OtpCode(
                email=normalized,
                code_hash=hash_otp_code(code, self.pepper),
                expires_at=now + self.ttl,
            )
        )
        self._record(normalized, ip, now)
        self.email_sender.send_code(normalized, code)

    def _enforce_limits(self, email: str, ip: str | None, now: datetime) -> None:
        """Barra o pedido se cooldown ou algum teto (e-mail/IP/global) estourou."""
        checks = [
            (SCOPE_OTP_EMAIL, email, OTP_RESEND_COOLDOWN, 1),
            (SCOPE_OTP_EMAIL, email, OTP_EMAIL_WINDOW, OTP_EMAIL_CAP),
            (SCOPE_OTP_GLOBAL, GLOBAL_KEY, OTP_GLOBAL_WINDOW, OTP_GLOBAL_CAP),
        ]
        if ip is not None:
            checks.append((SCOPE_OTP_IP, ip, OTP_IP_WINDOW, OTP_IP_CAP))
        for scope, key, window, cap in checks:
            if self.rate_limiter.count_since(scope, key, now - window) >= cap:
                raise RateLimited("muitas solicitações de código; aguarde e tente de novo")

    def _record(self, email: str, ip: str | None, now: datetime) -> None:
        """Registra o pedido nos escopos relevantes (alimenta as janelas futuras)."""
        self.rate_limiter.record(SCOPE_OTP_EMAIL, email, now)
        self.rate_limiter.record(SCOPE_OTP_GLOBAL, GLOBAL_KEY, now)
        if ip is not None:
            self.rate_limiter.record(SCOPE_OTP_IP, ip, now)


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
            Unauthorized: código inexistente, errado, expirado, já consumido, com
                tentativas esgotadas (#194) ou de conta desativada (kill-switch).
        """
        normalized = normalize_email(email)
        now = self.clock.now()
        otp = self.otps.get_active(normalized, now)
        if otp is None:
            raise Unauthorized("código inválido ou expirado")
        attempts = otp.attempts or 0
        if attempts >= MAX_OTP_ATTEMPTS:
            # Estourou o teto: o código morre aqui, mesmo que o dígito esteja certo.
            otp.consumed_at = now
            self.otps.save(otp)
            raise Unauthorized("código inválido ou expirado")
        if otp.code_hash != hash_otp_code(code, self.pepper):
            otp.attempts = attempts + 1
            self.otps.save(otp)
            raise Unauthorized("código inválido ou expirado")
        otp.consumed_at = now
        self.otps.save(otp)

        user = self.users.get_by_email(normalized)
        if user is not None and user.is_active is False:
            raise Unauthorized("conta indisponível")
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
class CompleteOnboarding:
    """Grava o Perfil mínimo do usuário e carimba `onboarded_at` (encerra o onboarding)."""

    users: UserRepository
    clock: Clock

    def __call__(self, user: User, *, display_name: str, origin_city: str, country: str) -> User:
        """Persiste nome, cidade de origem e país, e carimba o fim do onboarding.

        A `cidade de origem` é texto livre por ora (o mapa cidade→aeroporto é Fase 5,
        ADR-0006). Cria o Perfil quando ausente ou atualiza o existente (idempotente);
        carimbar `onboarded_at` é o que faz `needs_onboarding` virar `False`.

        Args:
            user: Usuário corrente (resolvido da sessão).
            display_name: Nome de exibição (obrigatório).
            origin_city: Cidade de origem em texto livre (obrigatória).
            country: País em ISO-3166 alfa-2 (obrigatório; normalizado para caixa-alta).

        Returns:
            O próprio usuário, já com o Perfil gravado.

        Raises:
            Invalid: nome, cidade de origem ou país em branco.
        """
        name = display_name.strip()
        city = origin_city.strip()
        country_code = country.strip().upper()
        if not name or not city or not country_code:
            raise Invalid("nome, cidade de origem e país são obrigatórios")

        profile = user.profile
        if profile is None:
            profile = Profile(user=user)
        profile.display_name = name
        profile.origin_city = city
        profile.country = country_code
        profile.onboarded_at = self.clock.now()
        self.users.save(user)
        return user


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
            if user.is_active is False:
                raise Unauthorized("conta indisponível")
        else:
            email = normalize_email(claims.email)
            existing = self.users.get_by_email(email)
            if existing is not None and existing.is_active is False:
                raise Unauthorized("conta indisponível")
            if existing is None:
                user = User(email=email, email_verified_at=now)
                self.users.save(user)
            else:
                user = existing
                if user.email_verified_at is None:
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
