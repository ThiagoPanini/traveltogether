from fastapi import FastAPI

app = FastAPI(title="travel·together API")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness: responde sem depender de banco (smoke do deploy faz grep por "status")."""
    return {"status": "ok"}
