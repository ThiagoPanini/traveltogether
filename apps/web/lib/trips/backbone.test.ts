import { describe, expect, it } from "vitest";
import {
  daysUntilDeparture,
  departureCountdown,
  deriveTrajetos,
  formatTripDate,
  type StopRead,
  summarizeSharedTransfers,
  type TripBackbone,
  trajetoStatus,
} from "./backbone";

/** Parada mínima para os cenários de translado compartilhado. */
function stop(partial: Partial<StopRead> & { position: number }): StopRead {
  return {
    id: `s${partial.position}`,
    city: "Cidade",
    country: "BR",
    arrival_date: null,
    desired_transfer: null,
    ...partial,
  };
}

/** Backbone mínimo para a derivação de Trajetos. */
function backbone(partial: Partial<TripBackbone>): TripBackbone {
  return {
    id: "t",
    name: "Viagem",
    description: null,
    departure_date: null,
    my_role: "organizer",
    origin: { city: "São Paulo", country: "BR" },
    entry_transfer: null,
    stops: [],
    crew: { members: [], pending_invitations: [] },
    ...partial,
  };
}

describe("formatTripDate (data de partida legível)", () => {
  it("formata YYYY-MM-DD como '14 set 2026' (sem 'de', sem ponto)", () => {
    expect(formatTripDate("2026-09-14")).toBe("14 set 2026");
  });

  it("preenche o dia com zero à esquerda", () => {
    expect(formatTripDate("2026-07-01")).toBe("01 jul 2026");
  });

  it("retorna null quando a data é nula ou malformada", () => {
    expect(formatTripDate(null)).toBeNull();
    expect(formatTripDate("amanhã")).toBeNull();
  });
});

describe("daysUntilDeparture (contador de embarque, null-safe)", () => {
  it("conta os dias entre hoje e a partida, ignorando a hora do dia", () => {
    // given: hoje 1 jul (com hora cheia) e partida em 8 jul
    const today = new Date(2026, 6, 1, 23, 30);
    // then: 7 dias, não 6 — a hora não desconta um dia
    expect(daysUntilDeparture("2026-07-08", today)).toBe(7);
  });

  it("é 0 no próprio dia da partida", () => {
    expect(daysUntilDeparture("2026-07-01", new Date(2026, 6, 1, 9, 0))).toBe(0);
  });

  it("retorna null quando não há data de partida", () => {
    expect(daysUntilDeparture(null, new Date(2026, 6, 1))).toBeNull();
  });
});

describe("departureCountdown (bloco de embarque do herói)", () => {
  const today = new Date(2026, 6, 1);

  it("conta os dias e pluraliza o caption", () => {
    expect(departureCountdown("2026-07-08", today)).toEqual({
      number: "7",
      caption: "dias p/ embarque",
    });
    expect(departureCountdown("2026-07-02", today)).toEqual({
      number: "1",
      caption: "dia p/ embarque",
    });
  });

  it("é honesto nas pontas: hoje, já partiu e sem data", () => {
    expect(departureCountdown("2026-07-01", today)).toEqual({
      number: "hoje",
      caption: "embarque",
    });
    expect(departureCountdown("2026-06-20", today)).toEqual({ number: "—", caption: "já partiu" });
    expect(departureCountdown(null, today)).toEqual({ number: "—", caption: "datas a definir" });
  });
});

describe("summarizeSharedTransfers (avanço dos translados compartilhados)", () => {
  it("ignora a 1ª parada (ponta de entrada é por-pessoa, não compartilhada)", () => {
    // given: só o destino — nenhum salto compartilhado
    const result = summarizeSharedTransfers([stop({ position: 0, desired_transfer: null })]);
    // then: denominador zero, sem proposta nem aberto
    expect(result).toEqual({ proposed: 0, total: 0, open: 0 });
  });

  it("conta como proposto só o salto com tipo concreto (undecided/nulo ficam abertos)", () => {
    const result = summarizeSharedTransfers([
      stop({ position: 0 }),
      stop({ position: 1, desired_transfer: { kind: "train", other_text: null } }),
      stop({ position: 2, desired_transfer: { kind: "undecided", other_text: null } }),
      stop({ position: 3, desired_transfer: null }),
    ]);
    // then: 1 de 3 compartilhados proposto, 2 em discussão
    expect(result).toEqual({ proposed: 1, total: 3, open: 2 });
  });

  it("100% quando todos os compartilhados têm tipo concreto", () => {
    const result = summarizeSharedTransfers([
      stop({ position: 0 }),
      stop({ position: 1, desired_transfer: { kind: "plane", other_text: null } }),
      stop({ position: 2, desired_transfer: { kind: "bus", other_text: null } }),
    ]);
    expect(result).toEqual({ proposed: 2, total: 2, open: 0 });
  });
});

describe("deriveTrajetos (linha do tempo dos Trajetos)", () => {
  it("1 parada só: sua ida + sua volta-semente, sem compartilhados", () => {
    const trip = backbone({
      origin: { city: "São Paulo", country: "BR" },
      entry_transfer: { kind: "plane", other_text: null },
      stops: [stop({ position: 0, city: "Nova York", arrival_date: "2026-07-02" })],
    });

    const trajetos = deriveTrajetos(trip);

    expect(trajetos).toEqual([
      {
        kind: "ida",
        from: "São Paulo",
        to: "Nova York",
        transfer: { kind: "plane", other_text: null },
        date: "2026-07-02",
      },
      { kind: "volta-seed", from: "Nova York", to: "São Paulo", transfer: null, date: null },
    ]);
  });

  it("N paradas: ida + um compartilhado por salto parada→parada + volta-semente", () => {
    const trip = backbone({
      origin: { city: "São Paulo", country: "BR" },
      entry_transfer: { kind: "plane", other_text: null },
      stops: [
        stop({ position: 0, city: "Nova York", arrival_date: "2026-07-02" }),
        stop({
          position: 1,
          city: "Boston",
          arrival_date: "2026-07-05",
          desired_transfer: { kind: "train", other_text: null },
        }),
        stop({
          position: 2,
          city: "Portland",
          arrival_date: null,
          desired_transfer: { kind: "undecided", other_text: null },
        }),
      ],
    });

    const trajetos = deriveTrajetos(trip);

    expect(trajetos.map((t) => [t.kind, t.from, t.to])).toEqual([
      ["ida", "São Paulo", "Nova York"],
      ["shared", "Nova York", "Boston"],
      ["shared", "Boston", "Portland"],
      ["volta-seed", "Portland", "São Paulo"],
    ]);
    // o compartilhado herda o desired_transfer e a data da parada de chegada
    expect(trajetos[1].transfer).toEqual({ kind: "train", other_text: null });
    expect(trajetos[1].date).toBe("2026-07-05");
    // arrival_date nulo propaga para o salto (não só na volta-semente hardcoded)
    expect(trajetos[2].date).toBeNull();
  });

  it("origem sem cidade no Perfil: cai para 'Sua cidade' nas pontas", () => {
    const trip = backbone({
      origin: { city: null, country: null },
      stops: [stop({ position: 0, city: "Lisboa" })],
    });

    const trajetos = deriveTrajetos(trip);

    expect(trajetos[0].from).toBe("Sua cidade");
    expect(trajetos[trajetos.length - 1].to).toBe("Sua cidade");
  });

  it("sem paradas: retorna lista vazia (defensivo — backbone real tem ≥1)", () => {
    expect(deriveTrajetos(backbone({ stops: [] }))).toEqual([]);
  });
});

describe("trajetoStatus (pílula de estado do Trajeto)", () => {
  it("volta-semente: muted 'emerge na pesquisa'", () => {
    const status = trajetoStatus({
      kind: "volta-seed",
      from: "A",
      to: "B",
      transfer: null,
      date: null,
    });
    expect(status).toEqual({ tone: "muted", label: "emerge na pesquisa" });
  });

  it("translado concreto: accent 'proposto: {tipo}' (texto livre quando 'other')", () => {
    expect(
      trajetoStatus({
        kind: "shared",
        from: "A",
        to: "B",
        transfer: { kind: "train", other_text: null },
        date: null,
      }),
    ).toEqual({ tone: "accent", label: "proposto: Trem" });

    expect(
      trajetoStatus({
        kind: "ida",
        from: "A",
        to: "B",
        transfer: { kind: "other", other_text: "Balsa" },
        date: null,
      }),
    ).toEqual({ tone: "accent", label: "proposto: Balsa" });
  });

  it("indefinido (undecided ou nulo): warning 'em discussão'", () => {
    expect(
      trajetoStatus({
        kind: "shared",
        from: "A",
        to: "B",
        transfer: { kind: "undecided", other_text: null },
        date: null,
      }),
    ).toEqual({ tone: "warning", label: "em discussão" });

    expect(trajetoStatus({ kind: "ida", from: "A", to: "B", transfer: null, date: null })).toEqual({
      tone: "warning",
      label: "em discussão",
    });
  });
});
