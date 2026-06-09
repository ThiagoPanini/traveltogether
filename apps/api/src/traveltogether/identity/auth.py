"""Funções de autenticação: JWT e verificação de allowlist."""

import os
from datetime import UTC, datetime

import jwt


def generate_token(email: str, *, secret: str | None = None, exp_seconds: int = 3600) -> str:
    """Gera um JWT HS256 com o email como subject."""
    key = secret or os.getenv("AUTH_SECRET", "")
    now = int(datetime.now(UTC).timestamp())
    payload: dict[str, object] = {
        "sub": email,
        "email": email,
        "iat": now,
        "exp": now + exp_seconds,
    }
    return jwt.encode(payload, key, algorithm="HS256")


def verify_token(token: str, *, secret: str | None = None) -> str | None:
    """Valida o JWT; retorna email se válido, None caso contrário."""
    key = secret or os.getenv("AUTH_SECRET", "")
    try:
        payload: dict[str, object] = jwt.decode(token, key, algorithms=["HS256"])
        email = payload.get("email")
        return email if isinstance(email, str) else None
    except jwt.PyJWTError:
        return None


def parse_allowlist(raw: str) -> set[str]:
    """Converte env var CSV em set de e-mails (lowercase, sem espaços)."""
    if not raw.strip():
        return set()
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def is_allowlisted(email: str, allowlist: set[str]) -> bool:
    """Verifica se o e-mail está na allowlist (case-insensitive)."""
    return email.lower() in allowlist
