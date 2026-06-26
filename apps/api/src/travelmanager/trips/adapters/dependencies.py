"""Composition root do contexto `trips` (ADR-0005): um `provide_*` por use-case.

Centraliza o wiring por contexto (não por rota): ganhou um Port novo, muda **um**
provider. As rotas ficam declarativas (`Depends(provide_…)`). O retorno anotado é
onde pyright confere que cada adapter satisfaz seu Port estruturalmente. Todos
compartilham o `get_db` do request (mesmo callable ⇒ mesma `Session` ⇒ uma só
unit-of-work, junto com a resolução de sessão do `identity`).
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from travelmanager.shared.clock import SystemClock
from travelmanager.shared.db import get_db
from travelmanager.trips.adapters.repository import (
    SqlAlchemyInvitationRepository,
    SqlAlchemyMembershipRepository,
    SqlAlchemyTripRepository,
    SqlAlchemyUserDirectory,
)
from travelmanager.trips.application.use_cases import (
    AcceptInvitation,
    CreateTrip,
    GetTripBackbone,
    InviteToTrip,
    ListMyInvitations,
    ListMyTrips,
    RevokeInvitation,
)


def provide_create_trip(db: Annotated[Session, Depends(get_db)]) -> CreateTrip:
    """Monta o use-case `CreateTrip` para o request corrente."""
    return CreateTrip(SqlAlchemyTripRepository(db), SystemClock())


def provide_get_trip_backbone(db: Annotated[Session, Depends(get_db)]) -> GetTripBackbone:
    """Monta o use-case `GetTripBackbone` para o request corrente."""
    return GetTripBackbone(
        SqlAlchemyTripRepository(db),
        SqlAlchemyMembershipRepository(db),
        SqlAlchemyUserDirectory(db),
    )


def provide_list_my_trips(db: Annotated[Session, Depends(get_db)]) -> ListMyTrips:
    """Monta o use-case `ListMyTrips` para o request corrente."""
    return ListMyTrips(SqlAlchemyMembershipRepository(db))


def provide_invite_to_trip(db: Annotated[Session, Depends(get_db)]) -> InviteToTrip:
    """Monta o use-case `InviteToTrip` para o request corrente."""
    return InviteToTrip(SqlAlchemyMembershipRepository(db), SqlAlchemyInvitationRepository(db))


def provide_revoke_invitation(db: Annotated[Session, Depends(get_db)]) -> RevokeInvitation:
    """Monta o use-case `RevokeInvitation` para o request corrente."""
    return RevokeInvitation(SqlAlchemyInvitationRepository(db), SqlAlchemyMembershipRepository(db))


def provide_list_my_invitations(db: Annotated[Session, Depends(get_db)]) -> ListMyInvitations:
    """Monta o use-case `ListMyInvitations` para o request corrente."""
    return ListMyInvitations(SqlAlchemyInvitationRepository(db), SqlAlchemyUserDirectory(db))


def provide_accept_invitation(db: Annotated[Session, Depends(get_db)]) -> AcceptInvitation:
    """Monta o use-case `AcceptInvitation` para o request corrente."""
    return AcceptInvitation(
        SqlAlchemyInvitationRepository(db),
        SqlAlchemyMembershipRepository(db),
        SystemClock(),
    )
