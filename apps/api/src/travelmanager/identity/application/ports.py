"""Ports do contexto identity (ADR-0013): contratos que os use-cases consomem.

`typing.Protocol` (estrutural, não `abc.ABC`): o adapter satisfaz o Port pela
**forma**, sem importá-lo — a seta de dependência aponta só para baixo. pyright
verifica no ponto de uso (o retorno anotado dos `provide_*`).
"""

from typing import Protocol

from travelmanager.identity.domain.models import AuthSession


class SessionRepository(Protocol):
    """Persistência de sessões opacas."""

    def get_by_token_hash(self, token_hash: str) -> AuthSession | None:
        """Busca a sessão pelo hash do token.

        Args:
            token_hash: O HMAC do token (o que se persiste).

        Returns:
            A sessão correspondente, ou `None` se não houver.
        """
        ...

    def save(self, session: AuthSession) -> None:
        """Cria ou persiste a mutação de uma sessão.

        Args:
            session: A entidade a persistir.
        """
        ...


class TokenGenerator(Protocol):
    """Fonte de tokens opacos."""

    def generate(self) -> str:
        """Cunha um token opaco, aleatório e URL-safe."""
        ...
