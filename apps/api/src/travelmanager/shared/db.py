"""Encanamento de dados cross-contexto: base declarativa, engine e unit-of-work.

Infra ortogonal aos contextos (ADR-0013): a `Base` que todas as entidades ORM
herdam, a engine derivada de `DATABASE_URL`, a checagem de readiness e o `get_db`
— onde a transação do request nasce e morre.

A fronteira transacional vive aqui: `repo.save()` faz `add` + `flush` (aflora
erro de constraint dentro do use-case); o **único** commit/rollback acontece em
`get_db` (request = unit-of-work). Use-case nunca commita.
"""

import os
from collections.abc import Iterator
from functools import lru_cache

from fastapi import HTTPException
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Base declarativa comum; `Base.metadata` é a fonte do autogenerate do Alembic."""


def get_database_url() -> str | None:
    """URL de conexão configurada.

    Returns:
        A `DATABASE_URL` do ambiente, ou `None` quando o app roda sem banco
        (ex.: liveness).
    """
    return os.environ.get("DATABASE_URL")


def normalize_database_url(url: str) -> str:
    """Força o driver psycopg (v3) — o instalado — mesmo se a URL vier sem sufixo.

    Sem isto, `postgresql://...` faz o SQLAlchemy buscar psycopg2 (ausente) e
    estourar na criação da engine. Aceita também o legado `postgres://`.

    Args:
        url: URL de conexão crua, possivelmente sem driver explícito.

    Returns:
        A mesma URL com o driver `psycopg` garantido quando aplicável.
    """
    if url.startswith("postgresql+"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    return url


@lru_cache
def get_engine() -> Engine | None:
    """Engine singleton.

    Returns:
        A engine construída a partir da `DATABASE_URL`, ou `None` quando ausente
        ou não construível.
    """
    url = get_database_url()
    if not url:
        return None
    try:
        return create_engine(normalize_database_url(url), pool_pre_ping=True)
    except Exception:
        return None


def get_engine_dep() -> Engine | None:
    """Dependência FastAPI para a readiness — sobrescrevível em testes."""
    return get_engine()


def database_ready(engine: Engine | None) -> bool:
    """Confirma conectividade com o banco.

    Args:
        engine: A engine a sondar (pode ser `None`).

    Returns:
        `True` quando um `SELECT 1` responde pela engine; `False` se ausente ou
        inacessível.
    """
    if engine is None:
        return False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@lru_cache
def get_sessionmaker() -> sessionmaker[Session] | None:
    """Fábrica de sessões ligada à engine.

    Returns:
        A `sessionmaker`, ou `None` quando não há banco configurado.
    """
    engine = get_engine()
    if engine is None:
        return None
    return sessionmaker(engine, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Dependência FastAPI: sessão por-request; o request **é** a unit-of-work.

    Commit único no sucesso, rollback em qualquer falha. Sobrescrevível em testes
    via `app.dependency_overrides`.

    Yields:
        A `Session` do request.

    Raises:
        HTTPException: 503 quando não há banco configurado.
    """
    factory = get_sessionmaker()
    if factory is None:
        raise HTTPException(status_code=503, detail="banco indisponível")
    db = factory()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
