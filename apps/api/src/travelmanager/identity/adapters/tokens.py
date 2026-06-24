"""Adapter outbound: `TokenGenerator` sobre `secrets` (ADR-0005).

A geração de token é não-determinística como o relógio: atrás de um Port para que
os testes possam injetar tokens previsíveis. O adapter default usa `secrets` para
cunhar o token opaco que viaja no cookie/Bearer (ADR-0004).
"""

import secrets


class SecretsTokenGenerator:
    """Adapter default: token opaco via `secrets.token_urlsafe`."""

    def generate(self) -> str:
        """Cunha um token aleatório e URL-safe."""
        return secrets.token_urlsafe(32)
