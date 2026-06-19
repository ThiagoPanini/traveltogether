import type { LegPublic, StopPublic, TripSummary } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { formatDateRange } from "../format/date";
import { type ActiveTripBundle, buildActivePanel, selectActiveTrip } from "./active-panel";

function trip(
  id: string,
  start: string | null,
  end: string | null,
  opts: { name?: string; origin?: string; stops?: StopPublic[] } = {},
): TripSummary {
  return {
    trip: {
      id,
      name: opts.name ?? id,
      description: "",
      origin: opts.origin ?? "São Paulo",
      airport_code: null,
      latitude: null,
      longitude: null,
      start_date: start,
      end_date: end,
      cover_image_key: null,
      cover_image_url: null,
      created_by: "u1",
      created_at: "2026-01-01T00:00:00",
    },
    membership: {
      id: `m-${id}`,
      trip_id: id,
      user_id: "u1",
      role: "organizer",
      joined_at: "2026-01-01T00:00:00",
    },
    stops: opts.stops ?? [],
    cover_image_url: null,
  };
}

function stop(id: string, city: string, order: number): StopPublic {
  return {
    id,
    trip_id: "eua",
    city,
    airport_code: null,
    latitude: null,
    longitude: null,
    arrival_date: null,
    departure_date: null,
    cover_image_key: null,
    cover_image_url: null,
    order,
  };
}

function leg(id: string, origin: string | null, dest: string | null): LegPublic {
  return {
    id,
    trip_id: "eua",
    origin_stop_id: origin,
    destination_stop_id: dest,
    target_date: null,
    order: 0,
  };
}

const today = "2026-06-14";

describe("selectActiveTrip", () => {
  it("retorna null sem viagens", () => {
    expect(selectActiveTrip([], today)).toBeNull();
  });

  it("prefere a Viagem em curso (hoje dentro do período)", () => {
    const trips = [
      trip("futura", "2026-08-01", "2026-08-10"),
      trip("emcurso", "2026-06-10", "2026-06-20"),
    ];
    expect(selectActiveTrip(trips, today)?.trip.id).toBe("emcurso");
  });

  it("sem Viagem em curso, escolhe a próxima futura mais próxima", () => {
    const trips = [trip("longe", "2026-12-01", null), trip("perto", "2026-07-01", null)];
    expect(selectActiveTrip(trips, today)?.trip.id).toBe("perto");
  });

  it("sem futura nem em curso, cai na passada mais recente", () => {
    const trips = [
      trip("velha", "2025-01-01", "2025-01-10"),
      trip("recente", "2026-02-01", "2026-02-10"),
    ];
    expect(selectActiveTrip(trips, today)?.trip.id).toBe("recente");
  });
});

describe("buildActivePanel", () => {
  it("estado vazio quando não há Viagens", () => {
    const panel = buildActivePanel({ trips: [], active: null, todayIso: today });
    expect(panel.isEmpty).toBe(true);
    expect(panel.hero).toBeNull();
    expect(panel.others).toEqual([]);
  });

  it("hero traz nome, período e membros da Viagem ativa", () => {
    const t = trip("eua", "2026-07-01", "2026-07-15", { name: "EUA Trip" });
    const members = [{ seed: "u1", label: "Marina", avatarUrl: null }];
    const panel = buildActivePanel({
      trips: [t],
      active: { trip: t, legs: [], members, legMode: {} },
      todayIso: today,
    });
    expect(panel.isEmpty).toBe(false);
    expect(panel.hero?.name).toBe("EUA Trip");
    expect(panel.hero?.periodLabel).toBe(formatDateRange("2026-07-01", "2026-07-15"));
    expect(panel.hero?.members).toEqual(members);
  });

  it("ribbon alterna cidades e saltos com o modo do Trajeto", () => {
    const stops = [stop("ny", "Nova York", 0), stop("mia", "Miami", 1)];
    const t = trip("eua", "2026-07-01", "2026-07-15", { origin: "São Paulo", stops });
    const legs = [leg("l1", null, "ny"), leg("l2", "ny", "mia"), leg("l3", "mia", null)];
    const legMode = { l1: "air", l2: "ground", l3: "air" } as const;
    const panel = buildActivePanel({
      trips: [t],
      active: { trip: t, legs, members: [], legMode: { ...legMode } },
      todayIso: today,
    });
    const ribbon = panel.hero?.ribbon ?? [];
    expect(
      ribbon.filter((r) => r.kind === "city").map((r) => (r.kind === "city" ? r.label : "")),
    ).toEqual(["São Paulo", "Nova York", "Miami", "São Paulo"]);
    expect(
      ribbon.filter((r) => r.kind === "hop").map((r) => (r.kind === "hop" ? r.mode : "")),
    ).toEqual(["air", "ground", "air"]);
  });

  it("radar = uma linha por Trajeto, com modo e estado pendente — sem preço", () => {
    const stops = [stop("ny", "Nova York", 0), stop("mia", "Miami", 1)];
    const t = trip("eua", "2026-07-01", "2026-07-15", { origin: "São Paulo", stops });
    const legs = [leg("l1", null, "ny"), leg("l2", "ny", "mia"), leg("l3", "mia", null)];
    const panel = buildActivePanel({
      trips: [t],
      active: { trip: t, legs, members: [], legMode: { l1: "air", l2: "ground", l3: "air" } },
      todayIso: today,
    });
    const radar = panel.hero?.radar ?? [];
    expect(radar.map((r) => r.fromTo)).toEqual([
      "São Paulo → Nova York",
      "Nova York → Miami",
      "Miami → São Paulo",
    ]);
    expect(radar.map((r) => r.mode)).toEqual(["air", "ground", "air"]);
    expect(radar.every((r) => r.status === "pending")).toBe(true);
    // estrutura-only: nenhuma chave de preço/sparkline/delta no contrato
    for (const r of radar) {
      expect(Object.keys(r).sort()).toEqual(["fromTo", "key", "mode", "status"]);
    }
  });

  it("Trajeto sem modo conhecido assume aéreo", () => {
    const stops = [stop("ny", "Nova York", 0)];
    const t = trip("eua", "2026-07-01", "2026-07-15", { origin: "São Paulo", stops });
    const legs = [leg("l1", null, "ny"), leg("l2", "ny", null)];
    const panel = buildActivePanel({
      trips: [t],
      active: { trip: t, legs, members: [], legMode: {} },
      todayIso: today,
    });
    expect((panel.hero?.radar ?? []).every((r) => r.mode === "air")).toBe(true);
  });

  it("cauda lista as outras Viagens como cards inertes (sem a ativa)", () => {
    const t = trip("eua", "2026-07-01", "2026-07-15", { name: "EUA Trip" });
    const other = trip("lisboa", "2026-09-01", "2026-09-10", { name: "Lisboa" });
    const panel = buildActivePanel({
      trips: [t, other],
      active: { trip: t, legs: [], members: [], legMode: {} },
      todayIso: today,
    });
    expect(panel.others.map((o) => o.id)).toEqual(["lisboa"]);
    expect(panel.others[0]?.name).toBe("Lisboa");
  });
});

// Garante que o bundle carrega o que a page busca (tipo exportado, sem runtime).
const _bundleShape: ActiveTripBundle | null = null;
void _bundleShape;
