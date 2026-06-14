"""Funções de autenticação: JWT e verificação de allowlist."""

import os
from datetime import UTC, datetime
from typing import TypedDict

import jwt


class TokenClaims(TypedDict):
    email: str
    display_name: str | None
    avatar_url: str | None


def generate_token(
    email: str,
    *,
    secret: str | None = None,
    exp_seconds: int = 3600,
    display_name: str | None = None,
    avatar_url: str | None = None,
) -> str:
    """Gera um JWT HS256 com o email como subject."""
    key = secret or os.getenv("AUTH_SECRET", "")
    now = int(datetime.now(UTC).timestamp())
    payload: dict[str, object] = {
        "sub": email,
        "email": email,
        "iat": now,
        "exp": now + exp_seconds,
    }
    if display_name is not None:
        payload["display_name"] = display_name
    if avatar_url is not None:
        payload["avatar_url"] = avatar_url
    return jwt.encode(payload, key, algorithm="HS256")


def verify_token(token: str, *, secret: str | None = None) -> TokenClaims | None:
    """Valida o JWT; retorna TokenClaims se válido, None caso contrário."""
    key = secret or os.getenv("AUTH_SECRET", "")
    try:
        payload: dict[str, object] = jwt.decode(token, key, algorithms=["HS256"])
        email = payload.get("email")
        if not isinstance(email, str):
            return None
        display_name = payload.get("display_name")
        avatar_url = payload.get("avatar_url")
        return TokenClaims(
            email=email,
            display_name=display_name if isinstance(display_name, str) else None,
            avatar_url=avatar_url if isinstance(avatar_url, str) else None,
        )
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
