"""Testes do loader leve de .env (platform/env.py)."""

import os
from pathlib import Path

import pytest

from traveltogether.platform.env import load_env_files


def test_loads_env_local_and_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / ".env").write_text("DATABASE_URL=from-env\nONLY_IN_ENV=base\n", encoding="utf-8")
    (tmp_path / ".env.local").write_text("DATABASE_URL=from-local\n", encoding="utf-8")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("ONLY_IN_ENV", raising=False)

    load_env_files(tmp_path)

    # .env.local tem precedência sobre .env
    assert os.getenv("DATABASE_URL") == "from-local"
    assert os.getenv("ONLY_IN_ENV") == "base"


def test_does_not_override_existing_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / ".env.local").write_text("AUTH_SECRET=from-file\n", encoding="utf-8")
    monkeypatch.setenv("AUTH_SECRET", "from-real-env")

    load_env_files(tmp_path)

    assert os.getenv("AUTH_SECRET") == "from-real-env"


def test_handles_values_with_equals_and_comments(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / ".env.local").write_text(
        "# comentário\n\nAUTH_SECRET=a=b=c\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("AUTH_SECRET", raising=False)

    load_env_files(tmp_path)

    # particiona no primeiro '=', preservando '=' embutidos no valor
    assert os.getenv("AUTH_SECRET") == "a=b=c"
