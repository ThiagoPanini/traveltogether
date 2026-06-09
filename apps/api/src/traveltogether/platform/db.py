"""Adapter de banco de dados — connectivity check para o health endpoint."""

import os
from typing import Literal

import sqlalchemy
from sqlalchemy import text


def check_db() -> Literal["ok", "error"]:
    """Testa conectividade com o Postgres; retorna 'ok' ou 'error'."""
    url = os.getenv("DATABASE_URL", "")
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
