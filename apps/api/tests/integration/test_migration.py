"""Integração: prova migração baseline + readiness contra Postgres real.

Fora do gate unitário (`-m "not integration"`). Defina TEST_DATABASE_URL
apontando para um Postgres vazio e rode `uv run pytest -m integration`.
"""

import os
import subprocess
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect

from travelmanager.db import database_ready

pytestmark = pytest.mark.integration

API_DIR = Path(__file__).resolve().parents[2]


@pytest.fixture
def database_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL não definido; integração exige Postgres real")
    return url


IDENTITY_TABLES = {"users", "profiles", "sessions", "otp_codes", "auth_identities"}


def test_baseline_upgrade_and_readiness(database_url: str) -> None:
    result = subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=API_DIR,
        env={**os.environ, "DATABASE_URL": database_url},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr

    engine = create_engine(database_url)
    assert database_ready(engine) is True
    tables = set(inspect(engine).get_table_names())
    assert "alembic_version" in tables
    assert IDENTITY_TABLES <= tables
