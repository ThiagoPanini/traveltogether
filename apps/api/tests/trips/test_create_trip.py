"""Use-case `CreateTrip` com fakes dos Ports (ADR-0005): a criação atômica (ADR-0011).

Trava o desenho do esqueleto: paradas ordenadas (1ª sem salto compartilhado, demais
`undecided`), a Participação do criador como Organizador com a ponta pessoal, e os
Convites cegos deduplicados/normalizados — tudo persistido numa só `save`.
"""

import uuid

import pytest

from tests.trips.conftest import FakeTripRepository, FixedClock
from travelmanager.shared.errors import Invalid
from travelmanager.trips.application.use_cases import (
    CreateTrip,
    InvitationInput,
    StopInput,
    TransferInput,
)
from travelmanager.trips.domain.models import (
    INVITATION_PENDING,
    ROLE_MEMBER,
    ROLE_ORGANIZER,
)


class TestCreateTrip:
    def test_monta_paradas_participacao_e_convites_numa_so_persistencia(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given: um criador e o esqueleto com duas paradas e um convite
        create = CreateTrip(trips, clock)
        creator = uuid.uuid4()
        # when:
        trip = create(
            creator_id=creator,
            name="Praias do Nordeste",
            description="  uma semana subindo o litoral  ",
            stops=[
                StopInput(city="Recife", country="br"),
                StopInput(city="Maceió", desired_transfer=TransferInput("plane")),
            ],
            entry_transfer=TransferInput("own_car"),
            invitations=[InvitationInput(email="amiga@example.com")],
        )
        # then: viagem normalizada, persistida uma única vez
        assert trips.saved == [trip]
        assert trip.name == "Praias do Nordeste"
        assert trip.description == "uma semana subindo o litoral"
        assert trip.created_by == creator
        # then: paradas em ordem, país em caixa-alta, destino é a última
        assert [s.city for s in trip.stops] == ["Recife", "Maceió"]
        assert trip.stops[0].country == "BR"
        assert trip.destination is not None and trip.destination.city == "Maceió"
        # then: a Participação do criador nasce Organizador com a ponta pessoal
        assert len(trip.memberships) == 1
        membership = trip.memberships[0]
        assert membership.user_id == creator
        assert membership.role == ROLE_ORGANIZER
        assert membership.is_organizer is True
        assert membership.entry_transfer == "own_car"
        # then: o convite nasce pendente e cego
        assert len(trip.invitations) == 1
        assert trip.invitations[0].email == "amiga@example.com"
        assert trip.invitations[0].status == INVITATION_PENDING
        assert trip.invitations[0].role == ROLE_MEMBER
        assert trip.invitations[0].invited_by == creator

    def test_primeira_parada_nunca_carrega_salto_compartilhado(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given: a 1ª parada vem com um translado proposto (que deve ser ignorado)
        create = CreateTrip(trips, clock)
        # when:
        trip = create(
            creator_id=uuid.uuid4(),
            name="Volta",
            stops=[
                StopInput(city="Curitiba", desired_transfer=TransferInput("plane")),
                StopInput(city="Floripa", desired_transfer=TransferInput("bus")),
            ],
        )
        # then: a 1ª fica sem salto (a ponta dela é pessoal), a 2ª preserva o tipo
        assert trip.stops[0].desired_transfer is None
        assert trip.stops[1].desired_transfer == "bus"

    def test_parada_intermediaria_sem_proposta_nasce_undecided(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given: a 2ª parada não traz translado nenhum
        create = CreateTrip(trips, clock)
        # when:
        trip = create(
            creator_id=uuid.uuid4(),
            name="Rota",
            stops=[StopInput(city="Belo Horizonte"), StopInput(city="Ouro Preto")],
        )
        # then: o salto compartilhado nasce "em discussão"
        assert trip.stops[1].desired_transfer == "undecided"

    def test_transfer_other_preserva_texto_livre(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given: um salto do tipo `other` com texto
        create = CreateTrip(trips, clock)
        # when:
        trip = create(
            creator_id=uuid.uuid4(),
            name="Travessia",
            stops=[
                StopInput(city="Manaus"),
                StopInput(
                    city="Santarém",
                    desired_transfer=TransferInput("other", other_text="barco regional"),
                ),
            ],
        )
        # then:
        assert trip.stops[1].desired_transfer == "other"
        assert trip.stops[1].desired_transfer_other == "barco regional"

    def test_texto_livre_so_vale_para_other(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given: um salto `bus` com texto livre acoplado (que deve ser descartado)
        create = CreateTrip(trips, clock)
        # when:
        trip = create(
            creator_id=uuid.uuid4(),
            name="Estrada",
            stops=[
                StopInput(city="Salvador"),
                StopInput(
                    city="Ilhéus",
                    desired_transfer=TransferInput("bus", other_text="ignora isto"),
                ),
            ],
        )
        # then:
        assert trip.stops[1].desired_transfer_other is None

    def test_convites_normalizam_email_e_deduplicam_no_request(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given: o mesmo e-mail repetido com caixa/espaços diferentes
        create = CreateTrip(trips, clock)
        # when:
        trip = create(
            creator_id=uuid.uuid4(),
            name="Reunião",
            stops=[StopInput(city="Porto Alegre")],
            invitations=[
                InvitationInput(email="Joao@Example.com"),
                InvitationInput(email="  joao@example.com "),
                InvitationInput(email="maria@example.com", role=ROLE_ORGANIZER),
            ],
        )
        # then: dois convites distintos, e-mails em caixa-baixa, papel preservado
        assert {i.email for i in trip.invitations} == {
            "joao@example.com",
            "maria@example.com",
        }
        maria = next(i for i in trip.invitations if i.email == "maria@example.com")
        assert maria.role == ROLE_ORGANIZER

    def test_nome_em_branco_e_recusado(self, trips: FakeTripRepository, clock: FixedClock) -> None:
        # given/when/then:
        create = CreateTrip(trips, clock)
        with pytest.raises(Invalid) as exc:
            create(creator_id=uuid.uuid4(), name="   ", stops=[StopInput(city="Natal")])
        assert exc.value.code == "trip_name_required"

    def test_viagem_sem_destino_e_recusada(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given/when/then:
        create = CreateTrip(trips, clock)
        with pytest.raises(Invalid) as exc:
            create(creator_id=uuid.uuid4(), name="Sonho", stops=[])
        assert exc.value.code == "trip_stops_required"

    def test_parada_sem_cidade_e_recusada(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given/when/then:
        create = CreateTrip(trips, clock)
        with pytest.raises(Invalid) as exc:
            create(creator_id=uuid.uuid4(), name="Vazio", stops=[StopInput(city="  ")])
        assert exc.value.code == "stop_city_required"

    def test_tipo_de_translado_invalido_e_recusado(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given/when/then:
        create = CreateTrip(trips, clock)
        with pytest.raises(Invalid) as exc:
            create(
                creator_id=uuid.uuid4(),
                name="Foguete",
                stops=[
                    StopInput(city="Brasília"),
                    StopInput(city="Goiânia", desired_transfer=TransferInput("rocket")),
                ],
            )
        assert exc.value.code == "transfer_kind_invalid"

    def test_papel_de_convite_invalido_e_recusado(
        self, trips: FakeTripRepository, clock: FixedClock
    ) -> None:
        # given/when/then:
        create = CreateTrip(trips, clock)
        with pytest.raises(Invalid) as exc:
            create(
                creator_id=uuid.uuid4(),
                name="Papéis",
                stops=[StopInput(city="Fortaleza")],
                invitations=[InvitationInput(email="x@y.com", role="capitão")],
            )
        assert exc.value.code == "role_invalid"
