from typing import Annotated

from fastapi import Depends, FastAPI, Response
from sqlalchemy import Engine

from travelmanager.db import database_ready, get_engine_dep

app = FastAPI(title="travel·manager API")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness: responde sem depender de banco (smoke do deploy faz grep por "status")."""
    return {"status": "ok"}


@app.get("/health/ready")
def ready(
    response: Response,
    engine: Annotated[Engine | None, Depends(get_engine_dep)],
) -> dict[str, str]:
    """Readiness: confirma conectividade com o banco; 503 quando indisponível."""
    if database_ready(engine):
        return {"status": "ok", "database": "up"}
    response.status_code = 503
    return {"status": "error", "database": "down"}
