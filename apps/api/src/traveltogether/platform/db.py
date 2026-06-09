"""Adapters de banco de dados."""

import os
from collections.abc import Iterator
from functools import lru_cache
from typing import Literal

import sqlalchemy
from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine


def get_database_url() -> str:
    """Retorna a URL de banco configurada no ambiente."""
    return os.getenv("DATABASE_URL", "")


@lru_cache(maxsize=1)
def get_engine() -> sqlalchemy.Engine:
    return create_engine(get_database_url())


def get_session() -> Iterator[Session]:
    """Sessão SQLModel para handlers HTTP."""
    with Session(get_engine()) as session:
        yield session


def create_db_schema(engine: sqlalchemy.Engine | None = None) -> None:
    """Cria tabelas conhecidas quando o projeto ainda não tem migrations."""
    if engine is None and not get_database_url():
        return
    SQLModel.metadata.create_all(engine or get_engine())


def check_db() -> Literal["ok", "error"]:
    """Testa conectividade com o Postgres; retorna 'ok' ou 'error'."""
    url = get_database_url()
    if not url:
        return "error"
    try:
        engine = sqlalchemy.create_engine(url)
        with engine.connect() as conn:
            _ = conn.execute(text("SELECT 1"))
        engine.dispose()
        return "ok"
    except Exception:  # noqa: BLE001
        return "error"
