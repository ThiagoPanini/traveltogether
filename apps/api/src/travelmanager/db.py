"""Encanamento de dados: engine a partir de DATABASE_URL e checagem de readiness.

A Fase 0+1 não lê nem escreve dados de domínio; este módulo existe para provar
conectividade (readiness) e dar à Fase 2 (identidade) um ponto de partida pronto.
"""

import os
from functools import lru_cache

from sqlalchemy import Engine, create_engine, text


def get_database_url() -> str | None:
    """URL de conexão configurada (None quando o app roda sem banco, ex.: liveness)."""
    return os.environ.get("DATABASE_URL")


def normalize_database_url(url: str) -> str:
    """Força o driver psycopg (v3) — o instalado — mesmo se a URL vier sem sufixo.

    Sem isto, `postgresql://...` faz o SQLAlchemy buscar psycopg2 (ausente) e
    estourar na criação da engine. Aceita também o legado `postgres://`.
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
    """Engine singleton. None quando DATABASE_URL ausente ou não construível."""
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
    """True quando um `SELECT 1` responde pela engine; False se ausente ou inacessível."""
    if engine is None:
        return False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
