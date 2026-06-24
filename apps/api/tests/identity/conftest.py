"""Fixtures e fakes do contexto identity (ADR-0005).

Reúne o "given" compartilhado dos testes do contexto: o usuário-semente, o
`TestClient` com `get_db` sobrescrito, o seam de minting de sessão (para os testes
de caracterização HTTP) e os **fakes dos Ports** (sem DB, sem transação) que os
testes de use-case consomem.
"""

from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from travelmanager.identity.adapters.dependencies import session_pepper
from travelmanager.identity.adapters.repository import SqlAlchemySessionRepository
from travelmanager.identity.adapters.tokens import SecretsTokenGenerator
from travelmanager.identity.application.use_cases import CreateSession
from travelmanager.identity.domain.models import AuthSession, User
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

    def save(self, session: AuthSession) -> None:
        self.saved.append(session)
        self._by_hash[session.token_hash] = session


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
