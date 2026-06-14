"""Testes do service do boundary collaboration — Comentário (ADR-0014).

Comportamentos verificados:
  1. Membro (qualquer papel) cria Comentário (invariante 17).
  2. Não-membro não cria (NotMemberError).
  3. Listagem por alvo (target_type, target_id) ordenada por criação.
  4. Autor edita o próprio; não-autor não (NotAuthorError).
  5. Moderação: Organizador apaga qualquer; Membro só o próprio.
  6. Corpo em branco é rejeitado.
"""

import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.collaboration.models import CommentTargetType
from traveltogether.collaboration.service import (
    EmptyCommentError,
    NotAuthorError,
    NotMemberError,
    create_comment,
    delete_comment,
    list_comments,
    update_comment,
)
from traveltogether.identity.models import User
from traveltogether.trips.models import Membership, MembershipRole, Trip


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


FARE = CommentTargetType.fare_quote


def test_member_can_create_comment(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.member)

    comment = create_comment(
        session,
        author_id=alice.id,
        trip_id=trip.id,
        target_type=FARE,
        target_id=uuid.uuid4(),
        body="bom preço",
    )

    assert comment.body == "bom preço"
    assert comment.author_id == alice.id
    assert comment.trip_id == trip.id


def test_non_member_cannot_create_comment(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    bob = _user(session, "bob@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)

    with pytest.raises(NotMemberError):
        create_comment(
            session,
            author_id=bob.id,
            trip_id=trip.id,
            target_type=FARE,
            target_id=uuid.uuid4(),
            body="quero opinar",
        )


def test_list_comments_ordered_by_creation(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.member)
    target = uuid.uuid4()
    other_target = uuid.uuid4()

    first = create_comment(
        session, author_id=alice.id, trip_id=trip.id, target_type=FARE, target_id=target, body="um"
    )
    second = create_comment(
        session,
        author_id=alice.id,
        trip_id=trip.id,
        target_type=FARE,
        target_id=target,
        body="dois",
    )
    create_comment(
        session,
        author_id=alice.id,
        trip_id=trip.id,
        target_type=FARE,
        target_id=other_target,
        body="outro alvo",
    )

    comments = list_comments(session, FARE, target)

    assert [c.id for c in comments] == [first.id, second.id]


def test_only_author_can_edit(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    bob = _user(session, "bob@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)
    _join(session, trip.id, bob.id, MembershipRole.member)

    comment = create_comment(
        session,
        author_id=bob.id,
        trip_id=trip.id,
        target_type=FARE,
        target_id=uuid.uuid4(),
        body="original",
    )

    edited = update_comment(session, comment, bob.id, "editado")
    assert edited.body == "editado"

    with pytest.raises(NotAuthorError):
        update_comment(session, comment, alice.id, "intruso")


def test_moderation_organizer_deletes_any_member_only_own(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    bob = _user(session, "bob@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.organizer)
    _join(session, trip.id, bob.id, MembershipRole.member)
    target = uuid.uuid4()

    bob_comment = create_comment(
        session,
        author_id=bob.id,
        trip_id=trip.id,
        target_type=FARE,
        target_id=target,
        body="do bob",
    )
    alice_comment = create_comment(
        session,
        author_id=alice.id,
        trip_id=trip.id,
        target_type=FARE,
        target_id=target,
        body="da alice",
    )

    # Membro não apaga comentário alheio.
    with pytest.raises(NotAuthorError):
        delete_comment(session, alice_comment, MembershipRole.member, bob.id)

    # Organizador apaga qualquer um.
    delete_comment(session, bob_comment, MembershipRole.organizer, alice.id)
    # Autor apaga o próprio.
    delete_comment(session, alice_comment, MembershipRole.member, alice.id)

    assert list_comments(session, FARE, target) == []


def test_blank_body_rejected(session: Session) -> None:
    alice = _user(session, "alice@example.com")
    trip = _trip(session, alice.id)
    _join(session, trip.id, alice.id, MembershipRole.member)

    with pytest.raises(EmptyCommentError):
        create_comment(
            session,
            author_id=alice.id,
            trip_id=trip.id,
            target_type=FARE,
            target_id=uuid.uuid4(),
            body="   ",
        )
