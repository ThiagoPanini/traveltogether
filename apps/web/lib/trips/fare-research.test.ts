import { beforeEach, describe, expect, it } from "vitest";
import type { Trajeto } from "./backbone";
import {
  createFareResearchDraft,
  fareResearchFromDraft,
  formatResearchMoney,
  formatResearchPoints,
  loadFareResearches,
  saveFareResearches,
  validateFareResearchStep,
  withReturnSegment,
} from "./fare-research";

const trajeto: Trajeto = {
  kind: "ida",
  from: "São Paulo",
  to: "Nova York",
  transfer: { kind: "plane", other_text: null },
  date: "2026-09-14",
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("rascunho de Pesquisa", () => {
  it("semeia o tipo proposto, mas não inventa a data de partida a partir da chegada", () => {
    const draft = createFareResearchDraft(trajeto);

    expect(draft.transferKind).toBe("plane");
    expect(draft.segments[0]).toMatchObject({
      from: "São Paulo",
      to: "Nova York",
      departureDate: "",
    });
  });

  it("ida-e-volta é uma Pesquisa com dois Trechos e pontas invertidas", () => {
    const draft = withReturnSegment(createFareResearchDraft(trajeto), true);

    expect(draft.segments).toHaveLength(2);
    expect(draft.segments[1]).toMatchObject({ from: "Nova York", to: "São Paulo" });
  });

  it("ao partir da volta-semente, ordena ida antes da volta e preserva a volta ao desfazer", () => {
    const returnSeed: Trajeto = {
      kind: "volta-seed",
      from: "Nova York",
      to: "São Paulo",
      transfer: null,
      date: null,
    };
    const single = createFareResearchDraft(returnSeed);
    const roundTrip = withReturnSegment(single, true, true);

    expect(roundTrip.segments.map((segment) => [segment.from, segment.to])).toEqual([
      ["São Paulo", "Nova York"],
      ["Nova York", "São Paulo"],
    ]);
    expect(withReturnSegment(roundTrip, false, true).segments[0]).toMatchObject({
      from: "Nova York",
      to: "São Paulo",
    });
  });
});

describe("validação progressiva da Pesquisa", () => {
  it("avião exige empresa, data e IATA em cada Trecho", () => {
    const draft = createFareResearchDraft(trajeto);

    expect(validateFareResearchStep(draft, 2)).toEqual([
      "Informe a empresa ou plataforma.",
      "Informe a data do trecho.",
      "Informe o aeroporto de origem do trecho com 3 letras.",
      "Informe o aeroporto de destino do trecho com 3 letras.",
    ]);
  });

  it("aceita dinheiro e pontos juntos sem converter uma unidade na outra", () => {
    const draft = {
      ...createFareResearchDraft(trajeto),
      moneyAmount: "3.420,50",
      usePoints: true,
      pointsAmount: "75000",
      loyaltyProgram: "LATAM Pass",
    };

    expect(validateFareResearchStep(draft, 3)).toEqual([]);
    const research = fareResearchFromDraft(draft, "ida:0", "q1", "2026-06-27T12:00:00Z");
    expect(research.money).toEqual({ amount: 3420.5, currency: "BRL" });
    expect(research.points).toEqual({ amount: 75000, program: "LATAM Pass" });
    expect(formatResearchMoney(research)).toMatch(/3\.420,50/);
    expect(formatResearchPoints(research)).toBe("75.000 pts · LATAM Pass");
  });
});

describe("persistência local da Pesquisa", () => {
  it("isola as fichas por Viagem e tolera dado corrompido", () => {
    const draft = { ...createFareResearchDraft(trajeto), moneyAmount: "1000" };
    const research = fareResearchFromDraft(draft, "ida:0", "q1");

    saveFareResearches("trip-a", [research]);

    expect(loadFareResearches("trip-a")).toEqual([research]);
    expect(loadFareResearches("trip-b")).toEqual([]);
    window.localStorage.setItem("travelmanager:fare-researches:trip-c", "não-json");
    expect(loadFareResearches("trip-c")).toEqual([]);
    window.localStorage.setItem(
      "travelmanager:fare-researches:trip-d",
      JSON.stringify({ version: 1, items: [null, {}] }),
    );
    expect(loadFareResearches("trip-d")).toEqual([]);
  });
});
