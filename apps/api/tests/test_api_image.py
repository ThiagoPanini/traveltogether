"""Guardrails para a imagem de producao da API."""

from pathlib import Path


def test_api_image_runs_migrations_before_starting_server() -> None:
    dockerfile = Path(__file__).resolve().parents[1] / "Dockerfile"
    content = dockerfile.read_text()

    assert "COPY alembic.ini ./alembic.ini" in content
    assert "COPY alembic ./alembic" in content
    assert "alembic upgrade head && exec uvicorn" in content
