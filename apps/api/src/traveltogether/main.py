"""traveltogether API — entrypoint.

Fase 0: walking skeleton com health check. Boundaries de domínio nascem a
partir do issue #4, com granularidade proporcional à complexidade — ver
docs/adr/0004-modelo-de-itinerario-e-ancoragem-da-pesquisa.md.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from traveltogether.platform.env import load_env_files

# Carrega .env.local/.env quando o ambiente não foi injetado pelo launcher
# (ex.: `uv run uvicorn ...` sem --env-file). Não sobrescreve env real.
load_env_files()

from traveltogether.collaboration.router import router as collaboration_router  # noqa: E402
from traveltogether.collaboration.task_router import router as tasks_router  # noqa: E402
from traveltogether.fares.router import router as fares_router  # noqa: E402
from traveltogether.fares.router import upvote_router  # noqa: E402
from traveltogether.identity.router import router as identity_router  # noqa: E402
from traveltogether.platform.db import check_db, create_db_schema  # noqa: E402
from traveltogether.shared.router import airlines_router, places_router  # noqa: E402
from traveltogether.shared.router import router as airports_router  # noqa: E402
from traveltogether.trips.router import router as trips_router  # noqa: E402


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    create_db_schema()
    yield


app = FastAPI(title="traveltogether API", version="0.0.0", lifespan=lifespan)
app.include_router(identity_router)
app.include_router(trips_router)
app.include_router(fares_router)
app.include_router(upvote_router)
app.include_router(airports_router)
app.include_router(airlines_router)
app.include_router(places_router)
app.include_router(collaboration_router)
app.include_router(tasks_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness + readiness probe — verifica app e conectividade com Postgres."""
    return {"status": "ok", "db": check_db()}
