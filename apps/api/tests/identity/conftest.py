"""Fixtures e fakes do contexto identity (ADR-0005).

Reúne o "given" compartilhado dos testes do contexto: o usuário-semente, o
`TestClient` com `get_db` sobrescrito, o seam de minting de sessão (para os testes
de caracterização HTTP) e os **fakes dos Ports** (sem DB, sem transação) que os
testes de use-case consomem.
"""

import uuid
from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from travelmanager.identity.adapters.dependencies import session_pepper
from travelmanager.identity.adapters.repository import SqlAlchemySessionRepository
from travelmanager.identity.adapters.tokens import SecretsTokenGenerator
from travelmanager.identity.application.use_cases import CreateSession
from travelmanager.identity.domain.google import GoogleClaims
from travelmanager.identity.domain.models import AuthIdentity, AuthSession, OtpCode, User
from travelmanager.main import app
from travelmanager.shared.clock import SystemClock
from travelmanager.shared.db import get_db


@pytest.fixture
def user(db_session: Session) -> User:
    """Usuário-semente persistido (ativo, sem perfil)."""
    person = User(email="viajante@example.com", email_verified_at=None)
    db_session.add(person)
    db_session.flush()
    return person


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    """`TestClient` com `get_db` apontado para a sessão SQLite do teste."""
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def mint_session(db_session: Session) -> Callable[..., str]:
    """Cunha uma sessão real e devolve o token em claro (seam de minting).

    Usa o `session_pepper()` de produção para que o token resolva pela rota.
    """
    create = CreateSession(
        SqlAlchemySessionRepository(db_session),
        SystemClock(),
        SecretsTokenGenerator(),
        session_pepper(),
    )

    def _mint(user: User, *, ttl: timedelta = timedelta(days=30)) -> str:
        _, token = create(user, ttl=ttl)
        return token

    return _mint


# --- fakes dos Ports (satisfazem os Protocols estruturalmente, sem DB) ---


class FixedClock:
    """`Clock` fake: devolve sempre o mesmo instante."""

    def __init__(self, moment: datetime) -> None:
        self._moment = moment

    def now(self) -> datetime:
        return self._moment


class FakeTokenGenerator:
    """`TokenGenerator` fake: devolve um token previsível."""

    def __init__(self, token: str = "tok-fixo") -> None:
        self._token = token

    def generate(self) -> str:
        return self._token


class FakeSessionRepository:
    """`SessionRepository` fake: registra a **intenção** de persistir em `saved`."""

    def __init__(self) -> None:
        self.saved: list[AuthSession] = []
        self._by_hash: dict[str, AuthSession] = {}

    def get_by_token_hash(self, token_hash: str) -> AuthSession | None:
        return self._by_hash.get(token_hash)

    def active_for_user(self, user_id: uuid.UUID) -> list[AuthSession]:
        return [s for s in self._by_hash.values() if s.user_id == user_id and s.revoked_at is None]

    def save(self, session: AuthSession) -> None:
        self.saved.append(session)
        self._by_hash[session.token_hash] = session


class FakeOtpRepository:
    """`OtpRepository` fake: guarda OTPs em memória, sem DB."""

    def __init__(self) -> None:
        self.saved: list[OtpCode] = []

    def save(self, otp: OtpCode) -> None:
        if otp not in self.saved:
            self.saved.append(otp)

    def get_active(self, email: str, now: datetime) -> OtpCode | None:
        ativos = [
            o
            for o in self.saved
            if o.email == email and o.consumed_at is None and o.expires_at > now
        ]
        return ativos[-1] if ativos else None


class FakeUserRepository:
    """`UserRepository` fake: resolve por e-mail em memória, sem DB."""

    def __init__(self) -> None:
        self.saved: list[User] = []
        self._by_email: dict[str, User] = {}

    def get_by_email(self, email: str) -> User | None:
        return self._by_email.get(email)

    def save(self, user: User) -> None:
        if user not in self.saved:
            self.saved.append(user)
        self._by_email[user.email] = user


class FakeIdentityRepository:
    """`IdentityRepository` fake: vínculos de provedor externo em memória, sem DB."""

    def __init__(self) -> None:
        self.saved: list[AuthIdentity] = []
        self._by_provider_subject: dict[tuple[str, str], AuthIdentity] = {}

    def get_by_provider_subject(self, provider: str, subject: str) -> AuthIdentity | None:
        return self._by_provider_subject.get((provider, subject))

    def save(self, identity: AuthIdentity) -> None:
        if identity not in self.saved:
            self.saved.append(identity)
        self._by_provider_subject[(identity.provider, identity.subject)] = identity


class FakeGoogleVerifier:
    """`GoogleTokenVerifier` fake: mapeia `id_token` cru → claims (ou `None`).

    Sem crypto: o teste registra de antemão quais tokens são válidos e que claims
    eles carregam; qualquer token desconhecido devolve `None` (recusado).
    """

    def __init__(self, claims_by_token: dict[str, GoogleClaims] | None = None) -> None:
        self._claims_by_token = claims_by_token or {}

    def verify(self, id_token: str) -> GoogleClaims | None:
        return self._claims_by_token.get(id_token)


class FakeCodeGenerator:
    """`CodeGenerator` fake: devolve um código previsível."""

    def __init__(self, code: str = "654321") -> None:
        self._code = code

    def generate(self) -> str:
        return self._code


class FakeEmailSender:
    """`EmailSender` fake: registra `(email, code)` enviados em `sent`."""

    def __init__(self) -> None:
        self.sent: list[tuple[str, str]] = []

    def send_code(self, email: str, code: str) -> None:
        self.sent.append((email, code))


class FakeRateLimiter:
    """`RateLimiter` fake: conta eventos em memória; `force` finge contagens.

    Por padrão conta os `record`ados de fato (cobre cooldown com `FixedClock`). Para
    exercitar uma janela específica sem depender do relógio, `force[(scope, key)]`
    sobrepõe a contagem daquele `(scope, key)`.
    """

    def __init__(self) -> None:
        self.events: list[tuple[str, str, datetime]] = []
        self.force: dict[tuple[str, str], int] = {}

    def count_since(self, scope: str, key: str, since: datetime) -> int:
        if (scope, key) in self.force:
            return self.force[(scope, key)]
        return sum(1 for s, k, at in self.events if s == scope and k == key and at >= since)

    def record(self, scope: str, key: str, at: datetime) -> None:
        self.events.append((scope, key, at))


@pytest.fixture
def clock() -> FixedClock:
    """Relógio fixo num instante UTC determinístico."""
    return FixedClock(datetime(2026, 6, 24, 12, 0, tzinfo=UTC))


@pytest.fixture
def sessions() -> FakeSessionRepository:
    """Repositório de sessões em memória."""
    return FakeSessionRepository()


@pytest.fixture
def tokens() -> FakeTokenGenerator:
    """Gerador de token previsível."""
    return FakeTokenGenerator()


@pytest.fixture
def otps() -> FakeOtpRepository:
    """Repositório de OTPs em memória."""
    return FakeOtpRepository()


@pytest.fixture
def users() -> FakeUserRepository:
    """Repositório de usuários em memória."""
    return FakeUserRepository()


@pytest.fixture
def identities() -> FakeIdentityRepository:
    """Repositório de vínculos de provedor externo em memória."""
    return FakeIdentityRepository()


@pytest.fixture
def codes() -> FakeCodeGenerator:
    """Gerador de código OTP previsível."""
    return FakeCodeGenerator()


@pytest.fixture
def email_sender() -> FakeEmailSender:
    """Transporte de e-mail que captura os envios."""
    return FakeEmailSender()


@pytest.fixture
def rate_limiter() -> FakeRateLimiter:
    """Rate-limiter em memória (permissivo por padrão)."""
    return FakeRateLimiter()
