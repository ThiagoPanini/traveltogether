"""Testes do service de perfil do boundary identity.

Comportamentos verificados:
  1. update_user_profile grava nome de exibição e avatar.
  2. display_name em branco vira None (não persiste string vazia).
  3. avatar_url em branco vira None.
  4. Passar None mantém o valor atual (atualização parcial).
"""

from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.identity.service import update_user_profile


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


def _make_user(session: Session, email: str = "alice@example.com") -> User:
    user = User(email=email)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_update_user_profile_sets_name_and_avatar(session: Session) -> None:
    user = _make_user(session)
    updated = update_user_profile(
        session, user, display_name="Alice", avatar_url="https://cdn/a.png"
    )
    assert updated.display_name == "Alice"
    assert updated.avatar_url == "https://cdn/a.png"


def test_update_user_profile_blank_name_clears_to_none(session: Session) -> None:
    user = _make_user(session)
    update_user_profile(session, user, display_name="Alice")
    updated = update_user_profile(session, user, display_name="   ")
    assert updated.display_name is None


def test_update_user_profile_blank_avatar_clears_to_none(session: Session) -> None:
    user = _make_user(session)
    update_user_profile(session, user, avatar_url="https://cdn/a.png")
    updated = update_user_profile(session, user, avatar_url="")
    assert updated.avatar_url is None


def test_update_user_profile_none_keeps_current_value(session: Session) -> None:
    user = _make_user(session)
    update_user_profile(session, user, display_name="Alice", avatar_url="https://cdn/a.png")
    updated = update_user_profile(session, user, display_name=None, avatar_url=None)
    assert updated.display_name == "Alice"
    assert updated.avatar_url == "https://cdn/a.png"
