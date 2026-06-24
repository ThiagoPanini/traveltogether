"""Regras puras de identidade (ADR-0013): lógica sem uma linha de banco.

O hash da sessão opaca é regra de domínio — `HMAC-SHA256(token, pepper)` em hex é
o que de fato se persiste (ADR-0011). Sem fallback de pepper aqui: o pepper é
injetado a partir do composition root (`adapters/dependencies.py`); o domínio não
conhece configuração nem ambiente.
"""

import hashlib
import hmac


def hash_session_token(token: str, pepper: str) -> str:
    """Calcula o HMAC-SHA256 do token de sessão.

    Args:
        token: Token opaco em claro (o segredo que viaja no cookie/Bearer).
        pepper: Chave HMAC do servidor.

    Returns:
        O digest em hexadecimal — o valor persistido em `AuthSession.token_hash`.
    """
    return hmac.new(pepper.encode(), token.encode(), hashlib.sha256).hexdigest()
