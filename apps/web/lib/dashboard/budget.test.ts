import type { FareQuotePublic, LegPublic } from "@traveltogether/types";
import { describe, expect, it } from "vitest";
import { computeBudget } from "./budget";

function makeLeg(id: string, order: number): LegPublic {
  return {
    id,
    trip_id: "trip-1",
    origin_stop_id: null,
    destination_stop_id: null,
    target_date: null,
    order,
  };
}

function makeFare(legId: string, value: string, currency: string): FareQuotePublic {
  return {
    id: `fare-${legId}`,
    leg_id: legId,
    registered_by: "user-1",
    created_at: "2026-01-01T00:00:00",
    value,
    currency,
    flight_date: "2026-09-01T00:00:00",
    duration_minutes: 600,
    stops: 0,
    checked_baggage: false,
    origin_airport: "GRU",
    destination_airport: "LIS",
    airline: "LATAM",
    link: "",
    notes: "",
    is_chosen: true,
    upvote_count: 0,
    user_voted: false,
    registered_by_display_name: null,
    registered_by_avatar_url: null,
  };
}

describe("computeBudget", () => {
  it("retorna vazio sem trajetos", () => {
    const result = computeBudget([], {}, 2);
    expect(result.legs).toHaveLength(0);
    expect(result.totalByCurrency).toEqual({});
    expect(result.perPersonByCurrency).toEqual({});
  });

  it("soma escolhidas de mesma moeda", () => {
    const legA = makeLeg("leg-a", 0);
    const legB = makeLeg("leg-b", 1);
    const fareA = makeFare("leg-a", "1000.00", "BRL");
    const fareB = makeFare("leg-b", "500.00", "BRL");

    const result = computeBudget([legA, legB], { "leg-a": fareA, "leg-b": fareB }, 2);
    expect(result.totalByCurrency).toEqual({ BRL: 1500 });
    expect(result.perPersonByCurrency).toEqual({ BRL: 750 });
  });

  it("agrupa moedas distintas sem conversão", () => {
    const legA = makeLeg("leg-a", 0);
    const legB = makeLeg("leg-b", 1);
    const fareA = makeFare("leg-a", "1000.00", "BRL");
    const fareB = makeFare("leg-b", "200.00", "EUR");

    const result = computeBudget([legA, legB], { "leg-a": fareA, "leg-b": fareB }, 4);
    expect(result.totalByCurrency).toEqual({ BRL: 1000, EUR: 200 });
    expect(result.perPersonByCurrency).toEqual({ BRL: 250, EUR: 50 });
    expect(result.hasMixedCurrencies).toBe(true);
  });

  it("trajeto sem escolhida marcado como indeciso", () => {
    const legA = makeLeg("leg-a", 0);
    const fareA = makeFare("leg-a", "800.00", "BRL");
    const legB = makeLeg("leg-b", 1);

    const result = computeBudget([legA, legB], { "leg-a": fareA, "leg-b": null }, 2);
    const undecidedLegs = result.legs.filter((l) => l.chosen === null);
    expect(undecidedLegs).toHaveLength(1);
    expect(result.hasUndecided).toBe(true);
    // trajeto undecided não entra no total
    expect(result.totalByCurrency).toEqual({ BRL: 800 });
  });

  it("divide por pessoa corretamente com 1 membro", () => {
    const leg = makeLeg("leg-a", 0);
    const fare = makeFare("leg-a", "999.99", "BRL");
    const result = computeBudget([leg], { "leg-a": fare }, 1);
    expect(result.perPersonByCurrency.BRL).toBeCloseTo(999.99, 2);
  });

  it("ordena legs por order", () => {
    const legB = makeLeg("leg-b", 1);
    const legA = makeLeg("leg-a", 0);
    const fareA = makeFare("leg-a", "100.00", "BRL");
    const fareB = makeFare("leg-b", "200.00", "BRL");

    const result = computeBudget([legB, legA], { "leg-a": fareA, "leg-b": fareB }, 2);
    expect(result.legs[0].legId).toBe("leg-a");
    expect(result.legs[1].legId).toBe("leg-b");
  });
});
