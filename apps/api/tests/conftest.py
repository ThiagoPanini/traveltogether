"""Fixtures unitárias: SQLite em memória com o schema dos modelos de identidade.

Os testes de gate não exigem Postgres (a migração real é coberta pela suíte
`integration`); aqui basta `Base.metadata.create_all` sobre um SQLite efêmero.
"""

from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from travelmanager.models import Base, User


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def user(db_session: Session) -> User:
    person = User(email="viajante@example.com", email_verified_at=None)
    db_session.add(person)
    db_session.flush()
    return person
