"""traveltogether API — entrypoint.

Fase 0: walking skeleton com health check. Boundaries de domínio nascem a
partir do issue #4, com granularidade proporcional à complexidade — ver
docs/adr/0004-modelo-de-itinerario-e-ancoragem-da-pesquisa.md.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from traveltogether.identity.router import router as identity_router
from traveltogether.platform.db import check_db, create_db_schema


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    create_db_schema()
    yield


app = FastAPI(title="traveltogether API", version="0.0.0", lifespan=lifespan)
app.include_router(identity_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness + readiness probe — verifica app e conectividade com Postgres."""
    return {"status": "ok", "db": check_db()}
