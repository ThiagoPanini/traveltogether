"""Use-cases de Convite com fakes dos Ports (ADR-0005 / ADR-0002).

Cobre convidar-depois (só Organizador, cego, sem duplicar pendente), revogar (libera o
e-mail), aceitar (casa e-mail→conta, cria a Participação com o papel do Convite — inv.
9/10, idempotente) e a caixa de entrada do convidado.
"""

import uuid
from datetime import UTC, datetime

import pytest

from tests.trips.conftest import (
    FakeInvitationRepository,
    FakeMembershipRepository,
    FakeUserDirectory,
    FixedClock,
)
from travelmanager.shared.errors import Conflict, Forbidden, Invalid, NotFound
from travelmanager.trips.application.ports import MemberDisplay
from travelmanager.trips.application.use_cases import (
    AcceptInvitation,
    InviteToTrip,
    ListMyInvitations,
    RevokeInvitation,
)
from travelmanager.trips.domain.models import (
    INVITATION_ACCEPTED,
    INVITATION_PENDING,
    INVITATION_REVOKED,
    ROLE_MEMBER,
    ROLE_ORGANIZER,
    Invitation,
    Membership,
)


def _organizer(trip_id: uuid.UUID, user_id: uuid.UUID) -> Membership:
    return Membership(trip_id=trip_id, user_id=user_id, role=ROLE_ORGANIZER)


def _member(trip_id: uuid.UUID, user_id: uuid.UUID) -> Membership:
    return Membership(trip_id=trip_id, user_id=user_id, role=ROLE_MEMBER)


class TestInviteToTrip:
    def test_organizador_cria_convite_pendente(
        self, memberships: FakeMembershipRepository, invitations: FakeInvitationRepository
    ) -> None:
        # given: um Organizador da viagem
        trip_id, inviter = uuid.uuid4(), uuid.uuid4()
        memberships.add(_organizer(trip_id, inviter))
        invite = InviteToTrip(memberships, invitations)
        # when:
        invitation = invite(trip_id, inviter, email="Novo@Example.com")
        # then: convite pendente, e-mail normalizado, persistido
        assert invitation.status == INVITATION_PENDING
        assert invitation.email == "novo@example.com"
        assert invitation.invited_by == inviter
        assert invitations.saved == [invitation]

    def test_nao_organizador_nao_pode_convidar(
        self, memberships: FakeMembershipRepository, invitations: FakeInvitationRepository
    ) -> None:
        # given: um Membro (não-Organizador)
        trip_id, member = uuid.uuid4(), uuid.uuid4()
        memberships.add(_member(trip_id, member))
        invite = InviteToTrip(memberships, invitations)
        # when/then:
        with pytest.raises(Forbidden) as exc:
            invite(trip_id, member, email="x@y.com")
        assert exc.value.code == "forbidden"

    def test_estranho_a_viagem_nao_pode_convidar(
        self, memberships: FakeMembershipRepository, invitations: FakeInvitationRepository
    ) -> None:
        # given: alguém sem Participação nenhuma
        invite = InviteToTrip(memberships, invitations)
        # when/then:
        with pytest.raises(Forbidden):
            invite(uuid.uuid4(), uuid.uuid4(), email="x@y.com")

    def test_convite_pendente_duplicado_e_conflito(
        self, memberships: FakeMembershipRepository, invitations: FakeInvitationRepository
    ) -> None:
        # given: já há um pendente para o e-mail nessa viagem
        trip_id, inviter = uuid.uuid4(), uuid.uuid4()
        memberships.add(_organizer(trip_id, inviter))
        invitations.add(Invitation(trip_id=trip_id, email="dup@example.com"))
        invite = InviteToTrip(memberships, invitations)
        # when/then:
        with pytest.raises(Conflict) as exc:
            invite(trip_id, inviter, email="dup@example.com")
        assert exc.value.code == "invitation_exists"

    def test_email_vazio_e_recusado(
        self, memberships: FakeMembershipRepository, invitations: FakeInvitationRepository
    ) -> None:
        # given: Organizador, e-mail em branco
        trip_id, inviter = uuid.uuid4(), uuid.uuid4()
        memberships.add(_organizer(trip_id, inviter))
        invite = InviteToTrip(memberships, invitations)
        # when/then:
        with pytest.raises(Invalid) as exc:
            invite(trip_id, inviter, email="   ")
        assert exc.value.code == "invitation_email_required"


class TestRevokeInvitation:
    def test_organizador_revoga_e_libera_o_email(
        self, invitations: FakeInvitationRepository, memberships: FakeMembershipRepository
    ) -> None:
        # given: um convite pendente e um Organizador
        trip_id, organizer = uuid.uuid4(), uuid.uuid4()
        memberships.add(_organizer(trip_id, organizer))
        invitation = invitations.add(Invitation(trip_id=trip_id, email="sai@example.com"))
        revoke = RevokeInvitation(invitations, memberships)
        # when:
        revoke(invitation.id, organizer)
        # then: marcado revogado (o índice parcial deixa de vigiar o e-mail)
        assert invitation.status == INVITATION_REVOKED
        assert invitation.is_pending is False

    def test_convite_inexistente_e_404(
        self, invitations: FakeInvitationRepository, memberships: FakeMembershipRepository
    ) -> None:
        # given/when/then:
        revoke = RevokeInvitation(invitations, memberships)
        with pytest.raises(NotFound) as exc:
            revoke(uuid.uuid4(), uuid.uuid4())
        assert exc.value.code == "invitation_not_found"

    def test_nao_revoga_convite_ja_aceito(
        self, invitations: FakeInvitationRepository, memberships: FakeMembershipRepository
    ) -> None:
        # given: um convite já aceito e um Organizador da viagem
        trip_id, organizer = uuid.uuid4(), uuid.uuid4()
        memberships.add(_organizer(trip_id, organizer))
        invitation = invitations.add(
            Invitation(trip_id=trip_id, email="dentro@example.com", status=INVITATION_ACCEPTED)
        )
        revoke = RevokeInvitation(invitations, memberships)
        # when/then: revogar é só para os pendentes — aceito vira 404 (não vaza e não corrompe)
        with pytest.raises(NotFound) as exc:
            revoke(invitation.id, organizer)
        assert exc.value.code == "invitation_not_found"
        # then: o histórico do aceite fica intacto
        assert invitation.status == INVITATION_ACCEPTED

    def test_nao_organizador_nao_revoga(
        self, invitations: FakeInvitationRepository, memberships: FakeMembershipRepository
    ) -> None:
        # given: um Membro tentando revogar
        trip_id, member = uuid.uuid4(), uuid.uuid4()
        memberships.add(_member(trip_id, member))
        invitation = invitations.add(Invitation(trip_id=trip_id, email="x@y.com"))
        revoke = RevokeInvitation(invitations, memberships)
        # when/then:
        with pytest.raises(Forbidden):
            revoke(invitation.id, member)


class TestAcceptInvitation:
    def test_aceite_cria_participacao_com_o_papel_do_convite(
        self,
        invitations: FakeInvitationRepository,
        memberships: FakeMembershipRepository,
        clock: FixedClock,
    ) -> None:
        # given: um convite pendente para o e-mail da conta
        trip_id, user = uuid.uuid4(), uuid.uuid4()
        invitation = invitations.add(
            Invitation(trip_id=trip_id, email="convidado@example.com", role=ROLE_MEMBER)
        )
        accept = AcceptInvitation(invitations, memberships, clock)
        # when:
        membership = accept(invitation.id, user_id=user, user_email="Convidado@example.com")
        # then: vira Participação com o papel do convite, na viagem certa
        assert membership.trip_id == trip_id
        assert membership.user_id == user
        assert membership.role == ROLE_MEMBER
        assert memberships.saved == [membership]
        # then: o convite carimba o aceite, vinculando a Participação
        assert invitation.status == INVITATION_ACCEPTED
        assert invitation.membership_id == membership.id
        assert invitation.accepted_at == datetime(2026, 6, 26, 12, 0, tzinfo=UTC)

    def test_papel_organizador_no_convite_entra_organizador(
        self,
        invitations: FakeInvitationRepository,
        memberships: FakeMembershipRepository,
        clock: FixedClock,
    ) -> None:
        # given: convite que carrega o papel Organizador
        trip_id, user = uuid.uuid4(), uuid.uuid4()
        invitation = invitations.add(
            Invitation(trip_id=trip_id, email="co@example.com", role=ROLE_ORGANIZER)
        )
        accept = AcceptInvitation(invitations, memberships, clock)
        # when:
        membership = accept(invitation.id, user_id=user, user_email="co@example.com")
        # then:
        assert membership.role == ROLE_ORGANIZER

    def test_email_divergente_e_recusado(
        self,
        invitations: FakeInvitationRepository,
        memberships: FakeMembershipRepository,
        clock: FixedClock,
    ) -> None:
        # given: convite de um e-mail diferente do da conta
        invitation = invitations.add(Invitation(trip_id=uuid.uuid4(), email="dono@example.com"))
        accept = AcceptInvitation(invitations, memberships, clock)
        # when/then:
        with pytest.raises(Forbidden) as exc:
            accept(invitation.id, user_id=uuid.uuid4(), user_email="outro@example.com")
        assert exc.value.code == "invitation_email_mismatch"

    def test_convite_nao_pendente_e_404(
        self,
        invitations: FakeInvitationRepository,
        memberships: FakeMembershipRepository,
        clock: FixedClock,
    ) -> None:
        # given: convite já revogado
        invitation = invitations.add(
            Invitation(trip_id=uuid.uuid4(), email="x@y.com", status=INVITATION_REVOKED)
        )
        accept = AcceptInvitation(invitations, memberships, clock)
        # when/then:
        with pytest.raises(NotFound) as exc:
            accept(invitation.id, user_id=uuid.uuid4(), user_email="x@y.com")
        assert exc.value.code == "invitation_not_found"

    def test_aceite_e_idempotente_se_ja_participa(
        self,
        invitations: FakeInvitationRepository,
        memberships: FakeMembershipRepository,
        clock: FixedClock,
    ) -> None:
        # given: a pessoa já é membro e há um convite pendente para ela
        trip_id, user = uuid.uuid4(), uuid.uuid4()
        existing = memberships.add(_member(trip_id, user))
        invitation = invitations.add(Invitation(trip_id=trip_id, email="ja@example.com"))
        accept = AcceptInvitation(invitations, memberships, clock)
        # when:
        result = accept(invitation.id, user_id=user, user_email="ja@example.com")
        # then: nenhuma Participação nova; o convite só carimba o aceite
        assert result is existing
        assert memberships.saved == [existing]
        assert invitation.status == INVITATION_ACCEPTED
        assert invitation.membership_id == existing.id


class TestListMyInvitations:
    def test_lista_pendentes_com_nome_de_quem_convidou(
        self, invitations: FakeInvitationRepository
    ) -> None:
        # given: um pendente com convidador resolvível
        inviter = uuid.uuid4()
        invitations.add(
            Invitation(trip_id=uuid.uuid4(), email="eu@example.com", invited_by=inviter)
        )
        directory = FakeUserDirectory(
            {inviter: MemberDisplay(display_name="Ana", initials="AN", city="SP")}
        )
        list_invitations = ListMyInvitations(invitations, directory)
        # when:
        result = list_invitations("Eu@example.com")
        # then:
        assert len(result) == 1
        assert result[0].inviter_name == "Ana"

    def test_convidador_nao_resolvido_fica_sem_nome(
        self, invitations: FakeInvitationRepository, directory: FakeUserDirectory
    ) -> None:
        # given: um pendente sem convidador registrado
        invitations.add(Invitation(trip_id=uuid.uuid4(), email="eu@example.com"))
        list_invitations = ListMyInvitations(invitations, directory)
        # when:
        result = list_invitations("eu@example.com")
        # then:
        assert result[0].inviter_name is None

    def test_so_devolve_os_do_email(
        self, invitations: FakeInvitationRepository, directory: FakeUserDirectory
    ) -> None:
        # given: pendentes de e-mails distintos
        invitations.add(Invitation(trip_id=uuid.uuid4(), email="eu@example.com"))
        invitations.add(Invitation(trip_id=uuid.uuid4(), email="outro@example.com"))
        list_invitations = ListMyInvitations(invitations, directory)
        # when:
        result = list_invitations("eu@example.com")
        # then:
        assert len(result) == 1
        assert result[0].invitation.email == "eu@example.com"
