# syntax=docker/dockerfile:1

FROM python:3.13-slim
LABEL org.opencontainers.image.source="https://github.com/ThiagoPanini/travelmanager"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# curl exigido pelo healthcheck do Coolify (roda dentro do container).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock alembic.ini ./
COPY alembic ./alembic
COPY src ./src
RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000
# Aplica as migrations pendentes e então sobe a API. Sem isso, um banco novo nasce
# sem schema (a imagem só rodava o uvicorn) — a causa do go-live #196 travar. O `exec`
# entrega o processo (e os sinais) ao uvicorn como PID 1.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn travelmanager.main:app --host 0.0.0.0 --port 8000"]
