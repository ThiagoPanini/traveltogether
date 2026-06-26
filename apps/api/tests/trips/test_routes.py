"""Caracterização HTTP do contexto `trips` (ADR-0005): o contrato visto pela borda.

Exercita o wiring completo (rota → use-case → repos reais → SQLite) sob a sessão real
do `identity`. Trava o contrato com o web BFF: o backbone devolvido na criação, a
visibilidade por Participação (404 sem vazar existência), o convite cego e o aceite que
casa e-mail→conta. Os ramos finos de regra ficam nos testes de use-case.
"""

from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from travelmanager.identity.domain.models import User


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _payload(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "name": "Praias do Nordeste",
        "description": "uma semana subindo o litoral",
        "departure_date": "2026-09-01",
        "entry_transfer": {"kind": "own_car"},
        "stops": [
            {"city": "Recife", "country": "BR"},
            {"city": "Maceió", "desired_transfer": {"kind": "plane"}},
        ],
        "invitations": [{"email": "convidado@example.com"}],
    }
    body.update(overrides)
    return body


class TestCreateTripRoute:
    def test_sem_credencial_retorna_401(self, client: TestClient) -> None:
        # given/when:
        resp = client.post("/trips", json=_payload())
        # then:
        assert resp.status_code == 401

    def test_cria_e_devolve_o_backbone(
        self, client: TestClient, organizer: User, mint_session: Callable[..., str]
    ) -> None:
        # given: um criador autenticado
        token = mint_session(organizer)
        # when:
        resp = client.post("/trips", json=_payload(), headers=_auth(token))
        # then: 201 com o esqueleto montado
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Praias do Nordeste"
        assert body["my_role"] == "organizer"
        # then: origem derivada do Perfil de quem vê (não da viagem)
        assert body["origin"] == {"city": "São Paulo", "country": "BR"}
        assert body["entry_transfer"] == {"kind": "own_car", "other_text": None}
        # then: paradas em ordem; 1ª sem salto compartilhado; última é o destino
        assert [s["city"] for s in body["stops"]] == ["Recife", "Maceió"]
        assert body["stops"][0]["desired_transfer"] is None
        assert body["stops"][1]["desired_transfer"]["kind"] == "plane"
        # then: a tripulação tem o criador (is_me) e o Organizador vê o pendente
        assert len(body["crew"]["members"]) == 1
        assert body["crew"]["members"][0]["is_me"] is True
        assert [i["email"] for i in body["crew"]["pending_invitations"]] == [
            "convidado@example.com"
        ]

    def test_nome_vazio_retorna_422_com_code(
        self, client: TestClient, organizer: User, mint_session: Callable[..., str]
    ) -> None:
        # given:
        token = mint_session(organizer)
        # when:
        resp = client.post("/trips", json=_payload(name="   "), headers=_auth(token))
        # then:
        assert resp.status_code == 422
        assert resp.json()["code"] == "trip_name_required"


class TestGetTripRoute:
    def test_membro_ve_o_backbone(
        self, client: TestClient, organizer: User, mint_session: Callable[..., str]
    ) -> None:
        # given: uma viagem criada
        token = mint_session(organizer)
        trip_id = client.post("/trips", json=_payload(), headers=_auth(token)).json()["id"]
        # when:
        resp = client.get(f"/trips/{trip_id}", headers=_auth(token))
        # then:
        assert resp.status_code == 200
        assert resp.json()["id"] == trip_id

    def test_nao_membro_recebe_404(
        self,
        client: TestClient,
        organizer: User,
        guest: User,
        mint_session: Callable[..., str],
    ) -> None:
        # given: viagem do organizer; um forasteiro autenticado
        owner_token = mint_session(organizer)
        trip_id = client.post(
            "/trips", json=_payload(invitations=[]), headers=_auth(owner_token)
        ).json()["id"]
        intruder = mint_session(guest)
        # when:
        resp = client.get(f"/trips/{trip_id}", headers=_auth(intruder))
        # then: 404 sem vazar existência
        assert resp.status_code == 404
        assert resp.json()["code"] == "trip_not_found"


class TestListTripsRoute:
    def test_lista_minhas_viagens(
        self, client: TestClient, organizer: User, mint_session: Callable[..., str]
    ) -> None:
        # given: uma viagem criada
        token = mint_session(organizer)
        client.post("/trips", json=_payload(), headers=_auth(token))
        # when:
        resp = client.get("/trips", headers=_auth(token))
        # then:
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["destination_city"] == "Maceió"
        assert items[0]["stop_count"] == 2
        assert items[0]["my_role"] == "organizer"


class TestInvitationRoutes:
    def test_organizador_convida_depois(
        self, client: TestClient, organizer: User, mint_session: Callable[..., str]
    ) -> None:
        # given: uma viagem sem convites
        token = mint_session(organizer)
        trip_id = client.post("/trips", json=_payload(invitations=[]), headers=_auth(token)).json()[
            "id"
        ]
        # when:
        resp = client.post(
            f"/trips/{trip_id}/invitations",
            json={"email": "Tarde@Example.com"},
            headers=_auth(token),
        )
        # then: 201 cego, e-mail normalizado
        assert resp.status_code == 201
        assert resp.json()["email"] == "tarde@example.com"

    def test_convite_duplicado_retorna_409(
        self, client: TestClient, organizer: User, mint_session: Callable[..., str]
    ) -> None:
        # given: já convidou um e-mail na criação
        token = mint_session(organizer)
        trip_id = client.post("/trips", json=_payload(), headers=_auth(token)).json()["id"]
        # when: convida o mesmo e-mail de novo
        resp = client.post(
            f"/trips/{trip_id}/invitations",
            json={"email": "convidado@example.com"},
            headers=_auth(token),
        )
        # then:
        assert resp.status_code == 409
        assert resp.json()["code"] == "invitation_exists"

    def test_nao_organizador_nao_convida(
        self,
        client: TestClient,
        organizer: User,
        guest: User,
        mint_session: Callable[..., str],
    ) -> None:
        # given: viagem do organizer; o convidado tenta convidar sem ser membro
        owner_token = mint_session(organizer)
        trip_id = client.post(
            "/trips", json=_payload(invitations=[]), headers=_auth(owner_token)
        ).json()["id"]
        outsider = mint_session(guest)
        # when:
        resp = client.post(
            f"/trips/{trip_id}/invitations",
            json={"email": "x@y.com"},
            headers=_auth(outsider),
        )
        # then:
        assert resp.status_code == 403

    def test_revogar_convite_retorna_204_e_some_da_caixa(
        self,
        client: TestClient,
        organizer: User,
        guest: User,
        mint_session: Callable[..., str],
    ) -> None:
        # given: o organizer convidou o e-mail do guest
        owner_token = mint_session(organizer)
        client.post("/trips", json=_payload(), headers=_auth(owner_token))
        guest_token = mint_session(guest)
        invitation_id = client.get("/invitations", headers=_auth(guest_token)).json()[0]["id"]
        # when: o organizer revoga
        resp = client.request("DELETE", f"/invitations/{invitation_id}", headers=_auth(owner_token))
        # then: 204 e a caixa do guest esvazia
        assert resp.status_code == 204
        assert client.get("/invitations", headers=_auth(guest_token)).json() == []


class TestAcceptFlow:
    def test_caixa_de_entrada_mostra_o_convite(
        self,
        client: TestClient,
        organizer: User,
        guest: User,
        mint_session: Callable[..., str],
    ) -> None:
        # given: o organizer convida o e-mail do guest na criação
        owner_token = mint_session(organizer)
        client.post("/trips", json=_payload(), headers=_auth(owner_token))
        guest_token = mint_session(guest)
        # when:
        resp = client.get("/invitations", headers=_auth(guest_token))
        # then: com nome da viagem e de quem convidou
        assert resp.status_code == 200
        inbox = resp.json()
        assert len(inbox) == 1
        assert inbox[0]["trip_name"] == "Praias do Nordeste"
        assert inbox[0]["invited_by_name"] == "Ana Lima"

    def test_aceitar_entra_na_viagem_como_membro(
        self,
        client: TestClient,
        db_session: Session,
        organizer: User,
        guest: User,
        mint_session: Callable[..., str],
    ) -> None:
        # given: convite pendente para o guest
        owner_token = mint_session(organizer)
        trip_id = client.post("/trips", json=_payload(), headers=_auth(owner_token)).json()["id"]
        guest_token = mint_session(guest)
        invitation_id = client.get("/invitations", headers=_auth(guest_token)).json()[0]["id"]
        # when: o guest aceita
        accept = client.post(f"/invitations/{invitation_id}/accept", headers=_auth(guest_token))
        # then: 200 com a viagem em que entrou
        assert accept.status_code == 200
        assert accept.json()["trip_id"] == trip_id
        # fronteira de request: em prod o commit do `get_db` expira a Identity Map; aqui
        # a sessão é compartilhada, então expiramos à mão para o read enxergar o membro novo.
        db_session.expire_all()
        # then: agora enxerga o backbone, como Membro, com a própria origem
        backbone = client.get(f"/trips/{trip_id}", headers=_auth(guest_token)).json()
        assert backbone["my_role"] == "member"
        assert backbone["origin"] == {"city": "Lisboa", "country": "PT"}
        # then: a ponta pessoal é por-pessoa (inv. 6) — o Membro não herda o own_car do criador
        assert backbone["entry_transfer"] is None
        # then: Membro não vê os convites pendentes (cego — ADR-0002)
        assert backbone["crew"]["pending_invitations"] == []
        assert len(backbone["crew"]["members"]) == 2

    def test_aceitar_de_outro_email_retorna_403(
        self,
        client: TestClient,
        organizer: User,
        guest: User,
        mint_session: Callable[..., str],
    ) -> None:
        # given: convite para um e-mail que não é o do guest
        owner_token = mint_session(organizer)
        trip_id = client.post(
            "/trips",
            json=_payload(invitations=[{"email": "alguem@example.com"}]),
            headers=_auth(owner_token),
        ).json()["id"]
        # the organizer can see the pending id via the backbone
        backbone = client.get(f"/trips/{trip_id}", headers=_auth(owner_token)).json()
        invitation_id = backbone["crew"]["pending_invitations"][0]["id"]
        guest_token = mint_session(guest)
        # when:
        resp = client.post(f"/invitations/{invitation_id}/accept", headers=_auth(guest_token))
        # then:
        assert resp.status_code == 403
        assert resp.json()["code"] == "invitation_email_mismatch"
