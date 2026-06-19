import { describe, expect, it } from "vitest";

import { formatDateRange } from "../format/date";
import { buildWizardPlan, deriveWizardLegs, summarizeWizard, type WizardState } from "./wizard";

function state(over: Partial<WizardState> = {}): WizardState {
  return {
    name: "EUA Trip",
    description: "",
    origin: "São Paulo",
    start: "2026-07-01",
    end: "2026-07-15",
    stops: [
      { city: "Nova York", arrive: "2026-07-01", depart: "2026-07-08" },
      { city: "Miami", arrive: "2026-07-08", depart: "2026-07-15" },
    ],
    legModes: ["air", "ground", "air"],
    inviteEmails: [],
    creatorEmail: "org@grupo.app",
    ...over,
  };
}

describe("deriveWizardLegs", () => {
  it("deriva os Trajetos das Paradas: origem→1ª … última→origem", () => {
    const legs = deriveWizardLegs("São Paulo", [
      { city: "Nova York", arrive: "", depart: "" },
      { city: "Miami", arrive: "", depart: "" },
    ]);
    expect(legs.map((l) => `${l.from} → ${l.to}`)).toEqual([
      "São Paulo → Nova York",
      "Nova York → Miami",
      "Miami → São Paulo",
    ]);
  });

  it("sem Paradas não há Trajeto", () => {
    expect(deriveWizardLegs("São Paulo", [])).toEqual([]);
  });
});

describe("buildWizardPlan", () => {
  it("cada Trajeto ganha 1 Rota direta com 1 Trecho de modo binário", () => {
    const plan = buildWizardPlan(state());
    expect(plan.legs).toHaveLength(3);
    for (const leg of plan.legs) {
      expect(leg.route).toEqual({ label: "direta" });
      expect(leg.segment.mode === "air" || leg.segment.mode === "ground").toBe(true);
    }
    expect(plan.legs.map((l) => l.segment.mode)).toEqual(["air", "ground", "air"]);
  });

  it("modo ausente assume aéreo", () => {
    const plan = buildWizardPlan(state({ legModes: [] }));
    expect(plan.legs.every((l) => l.segment.mode === "air")).toBe(true);
  });

  it("e-mails viram Convites pendentes, sem o criador, deduplicados", () => {
    const plan = buildWizardPlan(
      state({
        creatorEmail: "org@grupo.app",
        inviteEmails: ["a@x.com", "A@x.com", "org@grupo.app", "b@x.com", "b@x.com"],
      }),
    );
    expect(plan.invites.map((i) => i.email)).toEqual(["a@x.com", "b@x.com"]);
  });

  it("o criador é o primeiro Organizador", () => {
    expect(buildWizardPlan(state()).creatorRole).toBe("organizer");
  });

  it("a Viagem carrega nome, período e origem sem capturar aeroporto", () => {
    const plan = buildWizardPlan(state());
    expect(plan.trip).toEqual({
      name: "EUA Trip",
      description: "",
      origin: "São Paulo",
      start_date: "2026-07-01",
      end_date: "2026-07-15",
    });
    expect(Object.keys(plan.trip)).not.toContain("airport_code");
  });

  it("as Paradas mantêm ordem e datas, sem aeroporto", () => {
    const plan = buildWizardPlan(state());
    expect(plan.stops).toEqual([
      { city: "Nova York", arrival_date: "2026-07-01", departure_date: "2026-07-08" },
      { city: "Miami", arrival_date: "2026-07-08", departure_date: "2026-07-15" },
    ]);
  });
});

describe("summarizeWizard (fita do fecho 'Viagem criada')", () => {
  it("encadeia as cidades origem → paradas → origem na fita", () => {
    const ribbon = summarizeWizard(state()).ribbon;
    expect(
      ribbon.filter((r) => r.kind === "city").map((r) => (r.kind === "city" ? r.label : "")),
    ).toEqual(["São Paulo", "Nova York", "Miami", "São Paulo"]);
  });

  it("conta os Trajetos no radar e carrega o modo de cada salto", () => {
    const s = summarizeWizard(state());
    expect(s.legCount).toBe(3);
    expect(
      s.ribbon.filter((r) => r.kind === "hop").map((r) => (r.kind === "hop" ? r.mode : "")),
    ).toEqual(["air", "ground", "air"]);
  });

  it("período usa o mesmo formato do resto do app", () => {
    expect(summarizeWizard(state()).periodLabel).toBe(formatDateRange("2026-07-01", "2026-07-15"));
  });

  it("grupo conta convites pendentes (dedupe, sem o criador)", () => {
    const s = summarizeWizard(
      state({
        creatorEmail: "org@grupo.app",
        inviteEmails: ["a@x.com", "A@x.com", "org@grupo.app", "b@x.com"],
      }),
    );
    expect(s.inviteCount).toBe(2);
  });

  it("sem Paradas a fita fica vazia de Trajetos", () => {
    const s = summarizeWizard(state({ stops: [], legModes: [] }));
    expect(s.legCount).toBe(0);
    expect(s.ribbon).toEqual([]);
  });
});
