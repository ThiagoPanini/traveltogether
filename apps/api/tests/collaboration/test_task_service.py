"""Testes do service de Tarefa (boundary collaboration, ADR-0014, invariante 18).

Comportamentos verificados:
  1. Organizador cria Tarefa com Responsáveis (membros).
  2. Não-Organizador não cria (NotOrganizerError).
  3. Responsável que não é Membro é rejeitado (InvalidAssigneeError).
  4. Responsável move o status; não-Responsável/não-Organizador não (NotAssigneeError).
  5. Organizador move o status de qualquer Tarefa.
  6. Título em branco é rejeitado (EmptyTitleError).
  7. Âncora válida (Trajeto da Viagem) é aceita; de outra Viagem é rejeitada.
  8. list_user_tasks devolve as Tarefas atribuídas ao usuário.
"""

import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.collaboration.models import TaskAnchorType, TaskStatus
from traveltogether.collaboration.task_service import (
    EmptyTitleError,
    InvalidAnchorError,
    InvalidAssigneeError,
    NotAssigneeError,
    NotOrganizerError,
    create_task,
    list_user_tasks,
    set_task_status,
)
from traveltogether.identity.models import User
from traveltogether.trips.models import Leg, Membership, MembershipRole, Trip


@pytest.fixture(name="session")
def session_fixture() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


def _user(session: Session, email: str) -> User:
    user = User(email=email)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _trip(session: Session, creator_id: uuid.UUID) -> Trip:
    trip = Trip(name="T", origin="São Paulo", created_by=creator_id)
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


def _join(session: Session, trip_id: uuid.UUID, user_id: uuid.UUID, role: MembershipRole) -> None:
    session.add(Membership(trip_id=trip_id, user_id=user_id, role=role))
    session.commit()


def test_organizer_creates_task_with_assignees(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    bob = _user(session, "bob@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)
    _join(session, trip.id, bob.id, MembershipRole.member)

    task = create_task(
        session,
        trip_id=trip.id,
        created_by=alice.id,
        title="Reservar hotel",
        assignee_ids=[bob.id],
    )

    assert task.title == "Reservar hotel"
    assert task.status == TaskStatus.todo
    assert list_user_tasks(session, bob.id)[0].id == task.id


def test_non_organizer_cannot_create(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    bob = _user(session, "bob@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)
    _join(session, trip.id, bob.id, MembershipRole.member)

    with pytest.raises(NotOrganizerError):
        create_task(session, trip_id=trip.id, created_by=bob.id, title="X")


def test_assignee_must_be_member(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    stranger = _user(session, "stranger@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)

    with pytest.raises(InvalidAssigneeError):
        create_task(
            session,
            trip_id=trip.id,
            created_by=alice.id,
            title="X",
            assignee_ids=[stranger.id],
        )


def test_assignee_moves_status(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    bob = _user(session, "bob@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)
    _join(session, trip.id, bob.id, MembershipRole.member)
    task = create_task(
        session, trip_id=trip.id, created_by=alice.id, title="X", assignee_ids=[bob.id]
    )

    moved = set_task_status(session, task, bob.id, TaskStatus.doing)
    assert moved.status == TaskStatus.doing


def test_non_assignee_cannot_move(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    bob = _user(session, "bob@example.com")
    carol = _user(session, "carol@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)
    _join(session, trip.id, bob.id, MembershipRole.member)
    _join(session, trip.id, carol.id, MembershipRole.member)
    task = create_task(
        session, trip_id=trip.id, created_by=alice.id, title="X", assignee_ids=[bob.id]
    )

    with pytest.raises(NotAssigneeError):
        set_task_status(session, task, carol.id, TaskStatus.done)


def test_organizer_moves_any_status(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    bob = _user(session, "bob@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)
    _join(session, trip.id, bob.id, MembershipRole.member)
    task = create_task(
        session, trip_id=trip.id, created_by=alice.id, title="X", assignee_ids=[bob.id]
    )

    moved = set_task_status(session, task, alice.id, TaskStatus.done)
    assert moved.status == TaskStatus.done


def test_blank_title_rejected(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)

    with pytest.raises(EmptyTitleError):
        create_task(session, trip_id=trip.id, created_by=alice.id, title="   ")


def test_anchor_must_belong_to_trip(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    trip = _trip(session, alice.id)
    other = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)

    leg = Leg(trip_id=other.id, order=0)
    session.add(leg)
    session.commit()
    session.refresh(leg)

    with pytest.raises(InvalidAnchorError):
        create_task(
            session,
            trip_id=trip.id,
            created_by=alice.id,
            title="X",
            anchor_type=TaskAnchorType.leg,
            anchor_id=leg.id,
        )


def test_anchor_valid_when_in_trip(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)
    leg = Leg(trip_id=trip.id, order=0)
    session.add(leg)
    session.commit()
    session.refresh(leg)

    task = create_task(
        session,
        trip_id=trip.id,
        created_by=alice.id,
        title="Comparar passagens",
        anchor_type=TaskAnchorType.leg,
        anchor_id=leg.id,
    )
    assert task.anchor_type == TaskAnchorType.leg
    assert task.anchor_id == leg.id
