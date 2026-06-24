"""Adapters outbound: repositórios de identidade sobre SQLAlchemy (ADR-0005).

Satisfazem os Ports **estruturalmente** (sem herdar). `save()` colapsa criação e
mutação num só método: em SQLAlchemy ambos são `add` + `flush` — o `flush` aflora
erro de constraint **dentro** do use-case (traduzível); a durabilidade fica para o
commit único em `get_db`.
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from travelmanager.identity.domain.models import AuthIdentity, AuthSession, OtpCode, User


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
