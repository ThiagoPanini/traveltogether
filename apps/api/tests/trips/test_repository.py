"""Adapters outbound de `trips` sobre SQLite real (ADR-0005).

Costura de persistência: prova que `save` grava e os `get`/queries leem de volta, que o
**índice parcial** barra dois Convites pendentes no mesmo `(trip, email)` mas libera o
e-mail após revogar (ADR-0002), e que o `UserDirectory` resolve display pelo join com o
`identity` (a única seta `trips → identity`, no adapter — ADR-0011).
"""

import uuid

import pytest
from sqlalchemy.orm import Session

from travelmanager.identity.domain.models import Profile, User
from travelmanager.shared.errors import Conflict
from travelmanager.trips.adapters.repository import (
    SqlAlchemyInvitationRepository,
    SqlAlchemyMembershipRepository,
    SqlAlchemyTripRepository,
    SqlAlchemyUserDirectory,
)
from travelmanager.trips.domain.models import (
    INVITATION_REVOKED,
    ROLE_ORGANIZER,
    Invitation,
    Membership,
    Stop,
    Trip,
)


def _make_user(db: Session, email: str) -> User:
    user = User(email=email)
    db.add(user)
    db.flush()
    return user


class TestSqlAlchemyTripRepository:
    def test_save_persiste_o_grafo_e_get_le_de_volta(self, db_session: Session) -> None:
        # given: uma viagem com paradas, a Participação do criador e um convite
        creator = _make_user(db_session, "criadora@example.com")
        trip = Trip(name="Litoral", created_by=creator.id)
        trip.stops.append(Stop(position=0, city="Recife"))
        trip.stops.append(Stop(position=1, city="Maceió"))
        trip.memberships.append(Membership(user_id=creator.id, role=ROLE_ORGANIZER))
        trip.invitations.append(Invitation(email="amiga@example.com"))
        repo = SqlAlchemyTripRepository(db_session)
        # when:
        repo.save(trip)
        # then: recuperável com o grafo e o destino derivado
        again = repo.get(trip.id)
        assert again is not None
        assert again is trip
        assert [s.city for s in again.stops] == ["Recife", "Maceió"]
        assert again.destination is not None and again.destination.city == "Maceió"

    def test_get_de_id_inexistente_devolve_none(self, db_session: Session) -> None:
        # given/when/then:
        repo = SqlAlchemyTripRepository(db_session)
        assert repo.get(uuid.uuid4()) is None


class TestSqlAlchemyMembershipRepository:
    def test_get_for_e_list_for_user(self, db_session: Session) -> None:
        # given: uma viagem e a Participação de um usuário
        creator = _make_user(db_session, "dona@example.com")
        trip = Trip(name="Serra", created_by=creator.id)
        db_session.add(trip)
        db_session.flush()
        repo = SqlAlchemyMembershipRepository(db_session)
        membership = Membership(trip_id=trip.id, user_id=creator.id, role=ROLE_ORGANIZER)
        repo.save(membership)
        # when/then:
        assert repo.get_for(trip.id, creator.id) is membership
        assert repo.list_for_user(creator.id) == [membership]
        assert repo.get_for(trip.id, uuid.uuid4()) is None


class TestSqlAlchemyInvitationRepository:
    def test_find_pending_e_list_pending_for_email(self, db_session: Session) -> None:
        # given: um convite pendente
        creator = _make_user(db_session, "host@example.com")
        trip = Trip(name="Ilhas", created_by=creator.id)
        db_session.add(trip)
        db_session.flush()
        repo = SqlAlchemyInvitationRepository(db_session)
        invitation = Invitation(trip_id=trip.id, email="guest@example.com")
        repo.save(invitation)
        # when/then:
        assert repo.find_pending(trip.id, "guest@example.com") is invitation
        assert repo.list_pending_for_email("guest@example.com") == [invitation]
        assert repo.find_pending(trip.id, "ninguem@example.com") is None

    def test_pendente_duplicado_viola_indice_parcial(self, db_session: Session) -> None:
        # given: um pendente já gravado para (trip, email)
        creator = _make_user(db_session, "host2@example.com")
        trip = Trip(name="Deserto", created_by=creator.id)
        db_session.add(trip)
        db_session.flush()
        repo = SqlAlchemyInvitationRepository(db_session)
        repo.save(Invitation(trip_id=trip.id, email="dup@example.com"))
        # when/then: o backstop race-safe traduz a violação do índice parcial em Conflict
        # (ADR-0005), entregando o mesmo `invitation_exists` da pré-checagem.
        with pytest.raises(Conflict) as exc:
            repo.save(Invitation(trip_id=trip.id, email="dup@example.com"))
        assert exc.value.code == "invitation_exists"

    def test_revogar_libera_o_email_para_re_convite(self, db_session: Session) -> None:
        # given: um convite que é revogado
        creator = _make_user(db_session, "host3@example.com")
        trip = Trip(name="Pampa", created_by=creator.id)
        db_session.add(trip)
        db_session.flush()
        repo = SqlAlchemyInvitationRepository(db_session)
        first = Invitation(trip_id=trip.id, email="again@example.com")
        repo.save(first)
        first.status = INVITATION_REVOKED
        db_session.flush()
        # when: um novo pendente para o mesmo e-mail
        second = Invitation(trip_id=trip.id, email="again@example.com")
        repo.save(second)
        # then: aceito — o índice parcial só vigia os pendentes
        assert repo.find_pending(trip.id, "again@example.com") is second


class TestSqlAlchemyUserDirectory:
    def test_resolve_nome_iniciais_e_cidade(self, db_session: Session) -> None:
        # given: um usuário com perfil
        user = _make_user(db_session, "perfilada@example.com")
        db_session.add(Profile(user_id=user.id, display_name="Ana Lima", origin_city="São Paulo"))
        db_session.flush()
        directory = SqlAlchemyUserDirectory(db_session)
        # when:
        displays = directory.displays_for([user.id])
        # then:
        assert displays[user.id].display_name == "Ana Lima"
        assert displays[user.id].initials == "AL"
        assert displays[user.id].city == "São Paulo"

    def test_usuario_sem_perfil_vem_com_nome_nulo(self, db_session: Session) -> None:
        # given: um usuário sem perfil
        user = _make_user(db_session, "sem-perfil@example.com")
        directory = SqlAlchemyUserDirectory(db_session)
        # when:
        displays = directory.displays_for([user.id])
        # then:
        assert displays[user.id].display_name is None
        assert displays[user.id].initials == ""

    def test_lista_vazia_nao_consulta(self, db_session: Session) -> None:
        # given/when/then:
        directory = SqlAlchemyUserDirectory(db_session)
        assert directory.displays_for([]) == {}
