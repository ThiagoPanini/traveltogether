import type { TripSummary } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { countdownDays, selectNextTrip } from "./next-trip";

function summary(id: string, start: string | null, name = id): TripSummary {
  return {
    trip: {
      id,
      name,
      description: "",
      origin: "São Paulo",
      airport_code: null,
      latitude: null,
      longitude: null,
      start_date: start,
      end_date: null,
      cover_image_key: null,
      cover_image_url: null,
      created_by: "u1",
      created_at: "2026-01-01T00:00:00",
    },
    membership: {
      id: "m1",
      trip_id: id,
      user_id: "u1",
      role: "member",
      joined_at: "2026-01-01T00:00:00",
    },
    stops: [],
    cover_image_url: null,
  };
}

const today = "2026-06-14";

describe("selectNextTrip", () => {
  it("retorna null sem viagens", () => {
    expect(selectNextTrip([], today)).toBeNull();
  });

  it("ignora viagens sem data de ida", () => {
    expect(selectNextTrip([summary("a", null)], today)).toBeNull();
  });

  it("ignora viagens já passadas", () => {
    expect(selectNextTrip([summary("a", "2026-01-01")], today)).toBeNull();
  });

  it("inclui viagem que começa hoje", () => {
    expect(selectNextTrip([summary("a", today)], today)?.trip.id).toBe("a");
  });

  it("escolhe a data de ida futura mais próxima", () => {
    const trips = [summary("far", "2026-12-01"), summary("near", "2026-07-01")];
    expect(selectNextTrip(trips, today)?.trip.id).toBe("near");
  });

  it("no empate mantém a primeira da lista", () => {
    const trips = [summary("first", "2026-07-01"), summary("second", "2026-07-01")];
    expect(selectNextTrip(trips, today)?.trip.id).toBe("first");
  });
});

describe("countdownDays", () => {
  it("conta dias inteiros até a ida", () => {
    expect(countdownDays("2026-06-24", today)).toBe(10);
  });

  it("zero no dia da ida", () => {
    expect(countdownDays(today, today)).toBe(0);
  });

  it("aceita datetime serializado da API", () => {
    expect(countdownDays("2026-06-24T00:00:00", today)).toBe(10);
  });
});
