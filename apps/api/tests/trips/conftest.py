"""Fixtures e fakes do contexto trips (ADR-0005).

Reúne o "given" compartilhado: o `FixedClock`, os **fakes dos Ports** (sem DB) que os
testes de use-case consomem, e — para a caracterização HTTP — o `TestClient` com
`get_db` sobrescrito mais o seam de minting de sessão reaproveitado do `identity` (a
costura de autenticação que `trips` herda).
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
from travelmanager.identity.domain.models import Profile, User
from travelmanager.main import app
from travelmanager.shared.clock import SystemClock
from travelmanager.shared.db import get_db
from travelmanager.trips.application.ports import MemberDisplay
from travelmanager.trips.domain.models import (
    INVITATION_PENDING,
    ROLE_MEMBER,
    Invitation,
    Membership,
    Trip,
)

# --- usuários-semente + costura de sessão (para os testes de rota) ---


@pytest.fixture
def organizer(db_session: Session) -> User:
    """Criador-semente com Perfil (origem São Paulo/BR), para a origem do backbone."""
    person = User(email="organizadora@example.com")
    db_session.add(person)
    db_session.flush()
    db_session.add(
        Profile(
            user_id=person.id,
            display_name="Ana Lima",
            country="BR",
            origin_city="São Paulo",
            onboarded_at=datetime.now(UTC),
        )
    )
    db_session.flush()
    return person


@pytest.fixture
def guest(db_session: Session) -> User:
    """Segundo usuário (o convidado), com Perfil próprio."""
    person = User(email="convidado@example.com")
    db_session.add(person)
    db_session.flush()
    db_session.add(
        Profile(
            user_id=person.id,
            display_name="Bruno Souza",
            country="PT",
            origin_city="Lisboa",
            onboarded_at=datetime.now(UTC),
        )
    )
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
    """Cunha uma sessão real e devolve o token em claro (seam de minting do identity)."""
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


class FakeTripRepository:
    """`TripRepository` fake: persiste em memória, atribuindo ids aos filhos no `save`.

    Imita o `flush`: PKs `None` (default só vale no INSERT real) ganham um `uuid4` e os
    filhos apontam `trip` de volta, para que os reads do use-case enxerguem o grafo.
    """

    def __init__(self) -> None:
        self.saved: list[Trip] = []
        self._by_id: dict[uuid.UUID, Trip] = {}

    def save(self, trip: Trip) -> None:
        if trip.id is None:
            trip.id = uuid.uuid4()
        for stop in trip.stops:
            if stop.id is None:
                stop.id = uuid.uuid4()
            stop.trip_id = trip.id
        for membership in trip.memberships:
            if membership.id is None:
                membership.id = uuid.uuid4()
            membership.trip_id = trip.id
            membership.trip = trip
        for invitation in trip.invitations:
            if invitation.id is None:
                invitation.id = uuid.uuid4()
            invitation.trip_id = trip.id
            invitation.trip = trip
        if trip not in self.saved:
            self.saved.append(trip)
        self._by_id[trip.id] = trip

    def get(self, trip_id: uuid.UUID) -> Trip | None:
        return self._by_id.get(trip_id)


class FakeMembershipRepository:
    """`MembershipRepository` fake: Participações em memória (id atribuído no `save`)."""

    def __init__(self) -> None:
        self.saved: list[Membership] = []
        self._items: list[Membership] = []

    def save(self, membership: Membership) -> None:
        if membership.id is None:
            membership.id = uuid.uuid4()
        if membership not in self._items:
            self._items.append(membership)
            self.saved.append(membership)

    def add(self, membership: Membership) -> Membership:
        """Atalho de teste: semeia uma Participação já existente."""
        self.save(membership)
        return membership

    def get_for(self, trip_id: uuid.UUID, user_id: uuid.UUID) -> Membership | None:
        for membership in self._items:
            if membership.trip_id == trip_id and membership.user_id == user_id:
                return membership
        return None

    def list_for_user(self, user_id: uuid.UUID) -> list[Membership]:
        return [m for m in self._items if m.user_id == user_id]


class FakeInvitationRepository:
    """`InvitationRepository` fake: Convites em memória (id atribuído no `save`)."""

    def __init__(self) -> None:
        self.saved: list[Invitation] = []
        self._by_id: dict[uuid.UUID, Invitation] = {}
        self._items: list[Invitation] = []

    def save(self, invitation: Invitation) -> None:
        # Simula o flush: PK e os defaults de coluna (`status`, `role`) só valem no
        # INSERT real, então um Convite recém-construído chega aqui com eles `None`.
        if invitation.id is None:
            invitation.id = uuid.uuid4()
        if invitation.status is None:
            invitation.status = INVITATION_PENDING
        if invitation.role is None:
            invitation.role = ROLE_MEMBER
        if invitation not in self._items:
            self._items.append(invitation)
            self.saved.append(invitation)
        self._by_id[invitation.id] = invitation

    def add(self, invitation: Invitation) -> Invitation:
        """Atalho de teste: semeia um Convite já existente."""
        self.save(invitation)
        return invitation

    def get(self, invitation_id: uuid.UUID) -> Invitation | None:
        return self._by_id.get(invitation_id)

    def list_pending_for_email(self, email: str) -> list[Invitation]:
        return [i for i in self._items if i.email == email and i.status == INVITATION_PENDING]

    def find_pending(self, trip_id: uuid.UUID, email: str) -> Invitation | None:
        for invitation in self._items:
            if (
                invitation.trip_id == trip_id
                and invitation.email == email
                and invitation.status == INVITATION_PENDING
            ):
                return invitation
        return None


class FakeUserDirectory:
    """`UserDirectory` fake: resolve display de um mapa pré-carregado (sem DB)."""

    def __init__(self, displays: dict[uuid.UUID, MemberDisplay] | None = None) -> None:
        self.displays = displays or {}

    def displays_for(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, MemberDisplay]:
        return {uid: self.displays[uid] for uid in user_ids if uid in self.displays}


@pytest.fixture
def clock() -> FixedClock:
    """Relógio fixo num instante UTC determinístico."""
    return FixedClock(datetime(2026, 6, 26, 12, 0, tzinfo=UTC))


@pytest.fixture
def trips() -> FakeTripRepository:
    """Repositório de Viagens em memória."""
    return FakeTripRepository()


@pytest.fixture
def memberships() -> FakeMembershipRepository:
    """Repositório de Participações em memória."""
    return FakeMembershipRepository()


@pytest.fixture
def invitations() -> FakeInvitationRepository:
    """Repositório de Convites em memória."""
    return FakeInvitationRepository()


@pytest.fixture
def directory() -> FakeUserDirectory:
    """Diretório de display em memória (vazio por padrão)."""
    return FakeUserDirectory()
