import { describe, expect, it } from "vitest";
import type { FareRow } from "./compare-fares";
import { sortFares } from "./compare-fares";

const base: Omit<FareRow, "id" | "value" | "upvote_count" | "is_chosen"> = {
  leg_id: "leg-1",
  registered_by: "user-1",
  created_at: "2026-01-01T00:00:00",
  currency: "BRL",
  flight_date: "2026-09-01T10:00:00",
  duration_minutes: 180,
  stops: 0,
  checked_baggage: true,
  origin_airport: "GRU",
  destination_airport: "EZE",
  airline: "LATAM",
  link: "",
  notes: "",
  user_voted: false,
  registered_by_display_name: null,
  registered_by_avatar_url: null,
};

function fare(id: string, value: string, upvote_count: number, is_chosen = false): FareRow {
  return { ...base, id, value, upvote_count, is_chosen };
}

describe("sortFares", () => {
  it("sorts by price ascending", () => {
    const fares = [fare("b", "2000.00", 0), fare("a", "1500.00", 0), fare("c", "3000.00", 0)];
    const sorted = sortFares(fares, "price");
    expect(sorted.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts by upvotes descending", () => {
    const fares = [fare("a", "1500.00", 1), fare("b", "2000.00", 5), fare("c", "3000.00", 2)];
    const sorted = sortFares(fares, "upvotes");
    expect(sorted.map((f) => f.id)).toEqual(["b", "c", "a"]);
  });

  it("chosen fare floats to top regardless of sort", () => {
    const fares = [
      fare("a", "1500.00", 0, false),
      fare("b", "5000.00", 0, true),
      fare("c", "2000.00", 0, false),
    ];
    const sorted = sortFares(fares, "price");
    expect(sorted[0].id).toBe("b");
  });

  it("returns empty array unchanged", () => {
    expect(sortFares([], "price")).toEqual([]);
  });
});
