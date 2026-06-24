"""Adapters outbound: repositórios de identidade sobre SQLAlchemy (ADR-0005).

Satisfazem os Ports **estruturalmente** (sem herdar). `save()` colapsa criação e
mutação num só método: em SQLAlchemy ambos são `add` + `flush` — o `flush` aflora
erro de constraint **dentro** do use-case (traduzível); a durabilidade fica para o
commit único em `get_db`.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from travelmanager.identity.domain.models import (
    AuthIdentity,
    AuthSession,
    OtpCode,
    RateEvent,
    User,
)


def _naive_utc(moment: datetime) -> datetime:
    """Converte para UTC naive (a forma gravada/comparada em `rate_events`)."""
    return moment.astimezone(UTC).replace(tzinfo=None) if moment.tzinfo is not None else moment


class SqlAlchemySessionRepository:
    """Repositório de sessões ligado a uma `Session` do request."""

    def __init__(self, db: Session) -> None:
        """Inicializa o repositório.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def get_by_token_hash(self, token_hash: str) -> AuthSession | None:
        """Busca a sessão pelo hash do token.

        Args:
            token_hash: O HMAC do token.

        Returns:
            A sessão correspondente, ou `None`.
        """
        return self._db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))

    def active_for_user(self, user_id: uuid.UUID) -> list[AuthSession]:
        """Lista as sessões não-revogadas do usuário.

        Args:
            user_id: Dono das sessões.

        Returns:
            As sessões com `revoked_at IS NULL`.
        """
        return list(
            self._db.scalars(
                select(AuthSession).where(
                    AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)
                )
            )
        )

    def save(self, session: AuthSession) -> None:
        """Persiste a sessão: `add` + `flush` (sem commit).

        Args:
            session: A entidade a persistir.
        """
        self._db.add(session)
        self._db.flush()


class SqlAlchemyOtpRepository:
    """Repositório de OTPs ligado a uma `Session` do request."""

    def __init__(self, db: Session) -> None:
        """Inicializa o repositório.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def save(self, otp: OtpCode) -> None:
        """Persiste o OTP: `add` + `flush` (sem commit).

        Args:
            otp: A entidade a persistir.
        """
        self._db.add(otp)
        self._db.flush()

    def get_active(self, email: str, now: datetime) -> OtpCode | None:
        """Devolve o OTP não-consumido mais recente do e-mail, se ainda resgatável.

        Filtra `consumed_at IS NULL` no banco (sem comparação de timezone) e ordena
        pelo mais novo; a validade temporal fica na entidade (`is_redeemable_at`,
        que normaliza naive→aware como a sessão faz).

        Args:
            email: E-mail normalizado.
            now: Instante de referência.

        Returns:
            O código resgatável, ou `None`.
        """
        otp = self._db.scalar(
            select(OtpCode)
            .where(OtpCode.email == email, OtpCode.consumed_at.is_(None))
            .order_by(OtpCode.created_at.desc())
        )
        return otp if otp is not None and otp.is_redeemable_at(now) else None


class SqlAlchemyUserRepository:
    """Repositório de usuários ligado a uma `Session` do request."""

    def __init__(self, db: Session) -> None:
        """Inicializa o repositório.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def get_by_email(self, email: str) -> User | None:
        """Busca o usuário pela chave natural (e-mail normalizado).

        Args:
            email: E-mail normalizado.

        Returns:
            O usuário, ou `None`.
        """
        return self._db.scalar(select(User).where(User.email == email))

    def save(self, user: User) -> None:
        """Persiste o usuário: `add` + `flush` (sem commit).

        Args:
            user: A entidade a persistir.
        """
        self._db.add(user)
        self._db.flush()


class SqlAlchemyRateLimiter:
    """`RateLimiter` sobre SQLAlchemy: conta e registra eventos em `rate_events`.

    Sem Redis no stack (#194): a janela é uma contagem `WHERE occurred_at >= since`.
    Instantes são normalizados para UTC naive antes de gravar/comparar, para que a
    contagem seja uniforme entre o SQLite dos testes e o Postgres.
    """

    def __init__(self, db: Session) -> None:
        """Inicializa o limitador.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def count_since(self, scope: str, key: str, since: datetime) -> int:
        """Conta os eventos de `(scope, key)` desde `since`.

        Args:
            scope: Família do limite.
            key: Identificador dentro do escopo.
            since: Início da janela.

        Returns:
            Quantos eventos caíram na janela.
        """
        total = self._db.scalar(
            select(func.count())
            .select_from(RateEvent)
            .where(
                RateEvent.scope == scope,
                RateEvent.key == key,
                RateEvent.occurred_at >= _naive_utc(since),
            )
        )
        return total or 0

    def record(self, scope: str, key: str, at: datetime) -> None:
        """Registra um evento de `(scope, key)`: `add` + `flush` (sem commit).

        Args:
            scope: Família do limite.
            key: Identificador dentro do escopo.
            at: Instante lógico do evento.
        """
        self._db.add(RateEvent(scope=scope, key=key, occurred_at=_naive_utc(at)))
        self._db.flush()


class SqlAlchemyIdentityRepository:
    """Repositório de vínculos de provedor externo ligado a uma `Session` do request."""

    def __init__(self, db: Session) -> None:
        """Inicializa o repositório.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def get_by_provider_subject(self, provider: str, subject: str) -> AuthIdentity | None:
        """Busca o vínculo pela chave `(provider, subject)`.

        Args:
            provider: Nome do provedor externo (ex.: `google`).
            subject: Identificador estável do usuário no provedor.

        Returns:
            O vínculo correspondente, ou `None`.
        """
        return self._db.scalar(
            select(AuthIdentity).where(
                AuthIdentity.provider == provider, AuthIdentity.subject == subject
            )
        )

    def save(self, identity: AuthIdentity) -> None:
        """Persiste o vínculo: `add` + `flush` (sem commit).

        Args:
            identity: A entidade a persistir.
        """
        self._db.add(identity)
        self._db.flush()
