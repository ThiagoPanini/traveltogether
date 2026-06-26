"""Use-cases de leitura com fakes dos Ports (ADR-0005): backbone e "minhas viagens".

`GetTripBackbone` aplica a visibilidade por Participação (inv. 9): quem não participa
recebe 404 — sem vazar existência (inv. 10). `ListMyTrips` devolve as Participações do
usuário (a borda as vira itens de lista).
"""

import uuid

import pytest

from tests.trips.conftest import (
    FakeMembershipRepository,
    FakeTripRepository,
    FakeUserDirectory,
)
from travelmanager.shared.errors import NotFound
from travelmanager.trips.application.ports import MemberDisplay
from travelmanager.trips.application.use_cases import GetTripBackbone, ListMyTrips
from travelmanager.trips.domain.models import (
    ROLE_MEMBER,
    ROLE_ORGANIZER,
    Membership,
    Stop,
    Trip,
)


def _seed_trip(trips: FakeTripRepository, *, creator: uuid.UUID) -> tuple[Trip, Membership]:
    """Cria uma viagem persistida (2 paradas + a Participação Organizador do criador)."""
    trip = Trip(name="Andes", created_by=creator)
    trip.stops.append(Stop(position=0, city="Santiago"))
    trip.stops.append(Stop(position=1, city="Mendoza"))
    membership = Membership(user_id=creator, role=ROLE_ORGANIZER)
    trip.memberships.append(membership)
    trips.save(trip)
    return trip, membership


class TestGetTripBackbone:
    def test_membro_recebe_rota_e_tripulacao_resolvida(
        self,
        trips: FakeTripRepository,
        memberships: FakeMembershipRepository,
    ) -> None:
        # given: uma viagem onde o viewer participa, com display resolvível
        viewer = uuid.uuid4()
        trip, membership = _seed_trip(trips, creator=viewer)
        memberships.add(membership)
        directory = FakeUserDirectory(
            {viewer: MemberDisplay(display_name="Ana Lima", initials="AL", city="São Paulo")}
        )
        get_backbone = GetTripBackbone(trips, memberships, directory)
        # when:
        backbone = get_backbone(trip.id, viewer)
        # then:
        assert backbone.trip is trip
        assert backbone.viewer_membership is membership
        assert backbone.member_displays[viewer].display_name == "Ana Lima"

    def test_nao_membro_recebe_404_sem_vazar_existencia(
        self,
        trips: FakeTripRepository,
        memberships: FakeMembershipRepository,
        directory: FakeUserDirectory,
    ) -> None:
        # given: a viagem existe, mas o viewer não participa
        trip, _ = _seed_trip(trips, creator=uuid.uuid4())
        get_backbone = GetTripBackbone(trips, memberships, directory)
        # when/then:
        with pytest.raises(NotFound) as exc:
            get_backbone(trip.id, uuid.uuid4())
        assert exc.value.code == "trip_not_found"


class TestListMyTrips:
    def test_devolve_as_participacoes_do_usuario(
        self, trips: FakeTripRepository, memberships: FakeMembershipRepository
    ) -> None:
        # given: o usuário participa de duas viagens (e há uma terceira alheia)
        user = uuid.uuid4()
        _, mine_a = _seed_trip(trips, creator=user)
        other_trip = Trip(name="Alheia", created_by=uuid.uuid4())
        mine_b = Membership(trip_id=other_trip.id, user_id=user, role=ROLE_MEMBER)
        memberships.add(mine_a)
        memberships.add(mine_b)
        memberships.add(Membership(trip_id=uuid.uuid4(), user_id=uuid.uuid4()))
        list_trips = ListMyTrips(memberships)
        # when:
        result = list_trips(user)
        # then:
        assert set(result) == {mine_a, mine_b}
