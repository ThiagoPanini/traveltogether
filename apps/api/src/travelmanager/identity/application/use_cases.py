"""Use-cases de sessão (ADR-0005): o "mint" que OTP e Google vão reusar (ADR-0004).

Cada use-case é um `@dataclass(frozen=True, slots=True)` callable: os Ports entram
como campos no composition-time, e a borda chama só `use_case(args)`. A política
de sessão (TTL, `last_used_at`, revogação) vive aqui; a persistência fica atrás do
`SessionRepository`; o tempo, atrás do `Clock`. Nenhuma linha de HTTP nem de
SQLAlchemy.

O kill-switch `is_active` **não** mora em `ResolveSession`: "não autenticado" e
"usuário desativado" colapsam num 401 e são decididos no inbound
(`get_current_session`), preservando o comportamento da #189.
"""

from dataclasses import dataclass
from datetime import timedelta

from travelmanager.identity.application.ports import SessionRepository, TokenGenerator
from travelmanager.identity.domain.models import AuthSession, User
from travelmanager.identity.domain.rules import hash_session_token
from travelmanager.shared.clock import Clock

DEFAULT_SESSION_TTL = timedelta(days=30)


@dataclass(frozen=True, slots=True)
class CreateSession:
    """Cunha uma sessão opaca para um usuário."""

    sessions: SessionRepository
    clock: Clock
    tokens: TokenGenerator
    pepper: str

    def __call__(
        self,
        user: User,
        *,
        user_agent: str | None = None,
        ttl: timedelta = DEFAULT_SESSION_TTL,
    ) -> tuple[AuthSession, str]:
        """Cria a sessão e devolve `(sessão, token_em_claro)`.

        O token cru só existe aqui e no retorno; o banco guarda apenas o hash.

        Args:
            user: Dono da sessão.
            user_agent: User-Agent do cliente, se conhecido.
            ttl: Tempo de vida da sessão.

        Returns:
            A sessão persistida e o token em claro.
        """
        token = self.tokens.generate()
        session = AuthSession(
            user_id=user.id,
            token_hash=hash_session_token(token, self.pepper),
            expires_at=self.clock.now() + ttl,
            user_agent=user_agent,
        )
        self.sessions.save(session)
        return session, token


@dataclass(frozen=True, slots=True)
class ResolveSession:
    """Resolve o token opaco na sessão válida correspondente."""

    sessions: SessionRepository
    clock: Clock
    pepper: str

    def __call__(self, raw_token: str) -> AuthSession | None:
        """Devolve a sessão válida do token, marcando o uso.

        Args:
            raw_token: Token opaco em claro vindo do Bearer.

        Returns:
            A sessão quando viva (não expirada e não revogada), ou `None` se
            inexistente/expirada/revogada. Quando viva, persiste `last_used_at`.
        """
        session = self.sessions.get_by_token_hash(hash_session_token(raw_token, self.pepper))
        now = self.clock.now()
        if session is None or not session.is_valid_at(now):
            return None
        session.last_used_at = now
        self.sessions.save(session)
        return session


@dataclass(frozen=True, slots=True)
class RevokeSession:
    """Revoga uma sessão (logout / kill-switch)."""

    sessions: SessionRepository
    clock: Clock

    def __call__(self, session: AuthSession) -> None:
        """Marca a sessão como revogada e persiste o efeito.

        Args:
            session: A sessão a revogar.
        """
        session.revoked_at = self.clock.now()
        self.sessions.save(session)
