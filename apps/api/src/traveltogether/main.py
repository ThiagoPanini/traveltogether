"""traveltogether API — entrypoint.

Fase 0: walking skeleton com health check. Boundaries de domínio nascem a
partir do issue #4, com granularidade proporcional à complexidade — ver
docs/adr/0004-modelo-de-itinerario-e-ancoragem-da-pesquisa.md.
"""

from fastapi import FastAPI

from traveltogether.platform.db import check_db

app = FastAPI(title="traveltogether API", version="0.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness + readiness probe — verifica app e conectividade com Postgres."""
    return {"status": "ok", "db": check_db()}
