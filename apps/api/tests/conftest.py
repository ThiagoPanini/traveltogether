"""Infra de teste compartilhada: SQLite em memória com o schema dos modelos.

Os testes de gate não exigem Postgres (a migração real é coberta pela suíte
`integration`); aqui basta `Base.metadata.create_all` sobre um SQLite efêmero. A
`Base` mora em `shared/db.py`; importar `identity.domain.models` registra as
tabelas em `Base.metadata`.
"""

from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import travelmanager.identity.domain.models  # noqa: F401 — registra as tabelas em Base.metadata
from travelmanager.shared.db import Base


@pytest.fixture
def db_session() -> Iterator[Session]:
    """Sessão SQLAlchemy sobre SQLite em memória com o schema criado."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
