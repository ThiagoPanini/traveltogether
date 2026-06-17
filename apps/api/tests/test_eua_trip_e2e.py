"""Teste de aceitação ponta-a-ponta da **EUA Trip** (cenário do ADR-0019).

Monta `SP → NY → Miami → Orlando → SP` inteira — `Rota`s, `Trecho`s e modos — e
afirma que o redesenho representa o caso real (#149):

- T1 `SP→NY` via Miami: `[GRU→MIA aéreo, MIA→NYC aéreo]`.
- T2 `NY→Miami`: `[NYC→MIA aéreo]` (só ida).
- T3 `Miami→Orlando`: `[MIA→ORL terrestre]`.
- T4 `Orlando→SP`: `[ORL→MIA terrestre, MIA→GRU aéreo]`.
- O bilhete `135.530 milhas LATAM + R$ 242,21` é **uma** `Pesquisa` ida-e-volta
  cobrindo `GRU→MIA` (T1) e `MIA→GRU` (T4); domésticos em US$; aluguel `Extra`.

Roda no gate (SQLite em memória, sem Postgres) exercitando os `service.py` —
a interface pública de cada boundary.
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

# importa os modelos de todos os boundaries tocados p/ registrar as tabelas na
# metadata global compartilhada antes do create_all.
import traveltogether.budget.models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import traveltogether.fares.models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import traveltogether.trips.models  # noqa: F401  # pyright: ignore[reportUnusedImport]
from traveltogether.budget.models import RateioBasis
from traveltogether.budget.service import aggregate_budget, create_extra
from traveltogether.fares.service import GroundSegmentError, create_fare_quote, fare_segment_ids
from traveltogether.identity.models import User
from traveltogether.trips.models import Segment, SegmentMode
from traveltogether.trips.routes_service import add_segment, create_route


@pytest.fixture(name="session")
def session_fixture() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


def test_eua_trip_end_to_end(session: Session) -> None:
    from traveltogether.fares.preferences_service import (
        toggle_preference,
        user_prefers_fare,
    )
    from traveltogether.trips.legs_service import create_leg
    from traveltogether.trips.routes_service import list_segments
    from traveltogether.trips.service import create_trip
    from traveltogether.trips.stops_service import create_stop

    # ── viajante de teste + Viagem ──────────────────────────────────────────
    thiago = User(id=uuid.uuid4(), email="panini.multi@gmail.com")
    session.add(thiago)
    session.commit()

    trip, _ = create_trip(session, thiago.id, "EUA Trip", "", "São Paulo")

    ny = create_stop(session, trip.id, "Nova York", airport_code="NYC")
    miami = create_stop(session, trip.id, "Miami", airport_code="MIA")
    orlando = create_stop(session, trip.id, "Orlando", airport_code="ORL")

    # ── Trajetos com Rotas/Trechos/modos do ADR-0019 ────────────────────────
    t1 = create_leg(session, trip.id, origin_stop_id=None, destination_stop_id=ny.id)
    r1 = create_route(session, t1.id, created_by=thiago.id, label="via Miami")
    gru_mia = add_segment(session, r1.id, origin_airport="GRU", destination_airport="MIA")
    mia_nyc = add_segment(session, r1.id, origin_airport="MIA", destination_airport="NYC")

    t2 = create_leg(session, trip.id, origin_stop_id=ny.id, destination_stop_id=miami.id)
    r2 = create_route(session, t2.id, created_by=thiago.id, label="direto")
    nyc_mia = add_segment(session, r2.id, origin_airport="NYC", destination_airport="MIA")

    t3 = create_leg(session, trip.id, origin_stop_id=miami.id, destination_stop_id=orlando.id)
    r3 = create_route(session, t3.id, created_by=thiago.id, label="de carro")
    mia_orl = add_segment(
        session, r3.id, origin_airport="MIA", destination_airport="ORL", mode=SegmentMode.ground
    )

    t4 = create_leg(session, trip.id, origin_stop_id=orlando.id, destination_stop_id=None)
    r4 = create_route(session, t4.id, created_by=thiago.id, label="carro + voo")
    add_segment(
        session, r4.id, origin_airport="ORL", destination_airport="MIA", mode=SegmentMode.ground
    )
    mia_gru = add_segment(session, r4.id, origin_airport="MIA", destination_airport="GRU")

    # sequência ordenada + modos (invariantes 22/26)
    assert [
        (s.origin_airport, s.destination_airport, s.mode) for s in list_segments(session, r1.id)
    ] == [
        ("GRU", "MIA", SegmentMode.air),
        ("MIA", "NYC", SegmentMode.air),
    ]
    assert [s.mode for s in list_segments(session, r2.id)] == [SegmentMode.air]
    assert [s.mode for s in list_segments(session, r3.id)] == [SegmentMode.ground]
    assert [s.mode for s in list_segments(session, r4.id)] == [SegmentMode.ground, SegmentMode.air]

    # ── Trecho terrestre não hospeda tarifa (invariante 26) ─────────────────
    with pytest.raises(GroundSegmentError):
        create_fare_quote(
            session=session,
            leg_id=t3.id,
            registered_by=thiago.id,
            value=Decimal("0"),
            currency="USD",
            flight_date=datetime(2025, 9, 5, tzinfo=UTC),
            duration_minutes=210,
            origin_airport="MIA",
            destination_airport="ORL",
            airline="",
            segment_id=mia_orl.id,
        )

    # ── bilhete ida-e-volta de pontos: GRU→MIA (T1) + MIA→GRU (T4) ───────────
    round_trip = create_fare_quote(
        session=session,
        leg_id=t1.id,
        registered_by=thiago.id,
        value=Decimal("242.21"),
        currency="BRL",
        flight_date=datetime(2025, 9, 1, tzinfo=UTC),
        duration_minutes=600,
        origin_airport="GRU",
        destination_airport="MIA",
        airline="LATAM",
        points=135_530,
        loyalty_program="milhas LATAM",
        segment_id=gru_mia.id,
        return_segment_id=mia_gru.id,
    )
    assert set(fare_segment_ids(session, round_trip.id)) == {gru_mia.id, mia_gru.id}

    # ── domésticos em US$ (uma Pesquisa por Trecho aéreo doméstico) ──────────
    dom_out = create_fare_quote(
        session=session,
        leg_id=t1.id,
        registered_by=thiago.id,
        value=Decimal("180.00"),
        currency="USD",
        flight_date=datetime(2025, 9, 1, tzinfo=UTC),
        duration_minutes=180,
        origin_airport="MIA",
        destination_airport="NYC",
        airline="American",
        segment_id=mia_nyc.id,
    )
    dom_back = create_fare_quote(
        session=session,
        leg_id=t2.id,
        registered_by=thiago.id,
        value=Decimal("160.00"),
        currency="USD",
        flight_date=datetime(2025, 9, 4, tzinfo=UTC),
        duration_minutes=190,
        origin_airport="NYC",
        destination_airport="MIA",
        airline="JetBlue",
        segment_id=nyc_mia.id,
    )

    # aluguel de carro como Extra (não é tarifa de Trecho terrestre)
    create_extra(
        session,
        trip.id,
        created_by=thiago.id,
        value=Decimal("320.00"),
        currency="USD",
        basis=RateioBasis.prorated,
        description="Aluguel de carro Miami→Orlando→Miami",
    )

    # ── Thiago marca suas Preferidas ────────────────────────────────────────
    toggle_preference(session, round_trip.id, thiago.id)
    toggle_preference(session, dom_out.id, thiago.id)
    toggle_preference(session, dom_back.id, thiago.id)

    # a Preferida da ida-e-volta resolve os DOIS Trechos aéreos (invariante 11)
    assert user_prefers_fare(session, round_trip.id, thiago.id)
    for seg_id in (gru_mia.id, mia_gru.id):
        seg = session.get(Segment, seg_id)
        assert seg is not None
        assert any(p.fare_quote_id == round_trip.id for p in _prefs_for_segment(session, seg_id))

    # ── Orçamento do Thiago: subtotais por unidade, sem cruzar (invariante 15)
    summary = aggregate_budget(session, trip.id)
    by_unit = {s.currency: s for s in summary.subtotals}
    assert set(by_unit) == {"BRL", "USD", "milhas LATAM"}

    # member_count = 1 (só o Organizador) → por-pessoa == por-grupo
    # ida-e-volta conta UMA vez (invariante 19): só a taxa de R$ 242,21 em BRL.
    assert by_unit["BRL"].per_person == Decimal("242.21")
    assert by_unit["milhas LATAM"].per_person == Decimal("135530")
    # US$: dois domésticos + aluguel.
    assert by_unit["USD"].per_person == Decimal("660.00")


def _prefs_for_segment(session: Session, segment_id: uuid.UUID):
    from sqlmodel import col, select

    from traveltogether.fares.models import Preference

    return list(session.exec(select(Preference).where(col(Preference.segment_id) == segment_id)))
