"""Adapters outbound: repositórios de `trips` sobre SQLAlchemy (ADR-0005).

Satisfazem os Ports **estruturalmente** (sem herdar). `save()` = `add` + `flush`: o
`flush` aflora erro de constraint dentro do use-case; a durabilidade fica para o
commit único em `get_db` (request = unit-of-work). O `SqlAlchemyUserDirectory` é a
**costura cross-contexto** (ADR-0011): é o único ponto de `trips` que importa o
`identity` — e só para **ler** display (nome/cidade) dos Usuários membros.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from travelmanager.identity.domain.models import Profile, User
from travelmanager.shared.errors import Conflict
from travelmanager.trips.application.ports import MemberDisplay
from travelmanager.trips.domain.models import (
    INVITATION_PENDING,
    Invitation,
    Membership,
    Trip,
)
from travelmanager.trips.domain.rules import initials


class SqlAlchemyTripRepository:
    """Repositório de Viagens ligado à `Session` do request."""

    def __init__(self, db: Session) -> None:
        """Inicializa o repositório.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def save(self, trip: Trip) -> None:
        """Persiste a Viagem e seus filhos em cascata: `add` + `flush` (sem commit).

        Args:
            trip: A entidade a persistir (com Paradas/Participações/Convites apensos).
        """
        self._db.add(trip)
        self._db.flush()

    def get(self, trip_id: uuid.UUID) -> Trip | None:
        """Busca a Viagem pelo id.

        Args:
            trip_id: Identificador da Viagem.

        Returns:
            A Viagem, ou `None`.
        """
        return self._db.get(Trip, trip_id)


class SqlAlchemyMembershipRepository:
    """Repositório de Participações ligado à `Session` do request."""

    def __init__(self, db: Session) -> None:
        """Inicializa o repositório.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def save(self, membership: Membership) -> None:
        """Persiste a Participação: `add` + `flush` (popula o id para o vínculo do aceite).

        Args:
            membership: A entidade a persistir.
        """
        self._db.add(membership)
        self._db.flush()

    def get_for(self, trip_id: uuid.UUID, user_id: uuid.UUID) -> Membership | None:
        """Busca a Participação de um usuário numa Viagem.

        Args:
            trip_id: A Viagem.
            user_id: O usuário.

        Returns:
            A Participação, ou `None`.
        """
        return self._db.scalar(
            select(Membership).where(Membership.trip_id == trip_id, Membership.user_id == user_id)
        )

    def list_for_user(self, user_id: uuid.UUID) -> list[Membership]:
        """Lista as Participações de um usuário (as Viagens que ele vê), mais novas antes.

        Args:
            user_id: Dono das Participações.

        Returns:
            As Participações do usuário.
        """
        return list(
            self._db.scalars(
                select(Membership)
                .where(Membership.user_id == user_id)
                .order_by(Membership.created_at.desc())
            )
        )


class SqlAlchemyInvitationRepository:
    """Repositório de Convites ligado à `Session` do request."""

    def __init__(self, db: Session) -> None:
        """Inicializa o repositório.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def save(self, invitation: Invitation) -> None:
        """Persiste o Convite: `add` + `flush`, traduzindo a corrida do índice parcial.

        O `flush` aflora o índice parcial `uq_invitation_trip_email_pending`: numa corrida
        entre dois convites pendentes para o mesmo `(trip, email)` (que escapam à
        pré-checagem `find_pending` por estarem em sessões distintas), o perdedor estoura
        `IntegrityError`. O outbound traduz para `Conflict` (ADR-0005) — o mesmo
        `invitation_exists` da pré-checagem, fechando o backstop race-safe do Port.

        Args:
            invitation: A entidade a persistir.

        Raises:
            Conflict: já há um convite pendente para esse e-mail nessa Viagem (corrida).
        """
        self._db.add(invitation)
        try:
            self._db.flush()
        except IntegrityError as exc:
            raise Conflict(
                "já há um convite pendente para esse e-mail", code="invitation_exists"
            ) from exc

    def get(self, invitation_id: uuid.UUID) -> Invitation | None:
        """Busca o Convite pelo id.

        Args:
            invitation_id: Identificador do Convite.

        Returns:
            O Convite, ou `None`.
        """
        return self._db.get(Invitation, invitation_id)

    def list_pending_for_email(self, email: str) -> list[Invitation]:
        """Lista os Convites pendentes de um e-mail (mais novos antes).

        Args:
            email: E-mail normalizado.

        Returns:
            Os Convites com `status='pending'` para o e-mail.
        """
        return list(
            self._db.scalars(
                select(Invitation)
                .where(Invitation.email == email, Invitation.status == INVITATION_PENDING)
                .order_by(Invitation.created_at.desc())
            )
        )

    def find_pending(self, trip_id: uuid.UUID, email: str) -> Invitation | None:
        """Acha o Convite pendente de um e-mail numa Viagem (pré-checagem do índice).

        Args:
            trip_id: A Viagem.
            email: E-mail normalizado.

        Returns:
            O Convite pendente, ou `None`.
        """
        return self._db.scalar(
            select(Invitation).where(
                Invitation.trip_id == trip_id,
                Invitation.email == email,
                Invitation.status == INVITATION_PENDING,
            )
        )


class SqlAlchemyUserDirectory:
    """`UserDirectory` sobre o `identity` (ADR-0011): só leitura de display do Perfil."""

    def __init__(self, db: Session) -> None:
        """Inicializa o diretório.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def displays_for(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, MemberDisplay]:
        """Resolve nome/iniciais/cidade de cada usuário pelo join `users`⋈`profiles`.

        Args:
            user_ids: Ids dos usuários a resolver.

        Returns:
            Mapa `user_id → MemberDisplay`; ids sem Perfil aparecem com nome/cidade
            nulos (iniciais vazias).
        """
        if not user_ids:
            return {}
        rows = self._db.execute(
            select(User.id, Profile.display_name, Profile.origin_city)
            .join(Profile, Profile.user_id == User.id, isouter=True)
            .where(User.id.in_(user_ids))
        )
        return {
            user_id: MemberDisplay(
                display_name=display_name,
                initials=initials(display_name),
                city=city,
            )
            for user_id, display_name, city in rows
        }
