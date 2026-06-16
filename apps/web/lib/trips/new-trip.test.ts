import { describe, expect, it } from "vitest";

import { newTripDatesValid } from "./new-trip";

// Datas ISO YYYY-MM-DD comparam lexicograficamente. Invariantes 4/5/6 do CONTEXT.
describe("newTripDatesValid", () => {
  it("aceita período válido sem paradas (Viagem pode existir sem Parada)", () => {
    expect(newTripDatesValid("2026-07-01", "2026-07-10", [])).toBe(true);
  });

  it("rejeita volta anterior à ida (invariante 4)", () => {
    expect(newTripDatesValid("2026-07-10", "2026-07-01", [])).toBe(false);
  });

  it("rejeita ida ou volta ausente", () => {
    expect(newTripDatesValid("", "2026-07-10", [])).toBe(false);
    expect(newTripDatesValid("2026-07-01", "", [])).toBe(false);
  });

  it("aceita paradas que cobrem o período da ida à volta (invariante 5)", () => {
    expect(
      newTripDatesValid("2026-07-01", "2026-07-10", [
        { arrive: "2026-07-01", depart: "2026-07-05" },
        { arrive: "2026-07-05", depart: "2026-07-10" },
      ]),
    ).toBe(true);
  });

  it("rejeita primeira Parada que não começa na ida (invariante 5)", () => {
    expect(
      newTripDatesValid("2026-07-01", "2026-07-10", [
        { arrive: "2026-07-02", depart: "2026-07-10" },
      ]),
    ).toBe(false);
  });

  it("rejeita última Parada que não termina na volta (invariante 5)", () => {
    expect(
      newTripDatesValid("2026-07-01", "2026-07-10", [
        { arrive: "2026-07-01", depart: "2026-07-08" },
      ]),
    ).toBe(false);
  });

  it("rejeita saída anterior à chegada na mesma Parada (invariante 6)", () => {
    expect(
      newTripDatesValid("2026-07-01", "2026-07-10", [
        { arrive: "2026-07-05", depart: "2026-07-03" },
      ]),
    ).toBe(false);
  });

  it("rejeita Parada fora do período (invariante 6)", () => {
    expect(
      newTripDatesValid("2026-07-01", "2026-07-10", [
        { arrive: "2026-07-01", depart: "2026-07-12" },
      ]),
    ).toBe(false);
  });

  it("rejeita paradas fora de ordem cronológica (invariante 6)", () => {
    expect(
      newTripDatesValid("2026-07-01", "2026-07-10", [
        { arrive: "2026-07-01", depart: "2026-07-06" },
        { arrive: "2026-07-04", depart: "2026-07-10" },
      ]),
    ).toBe(false);
  });

  it("rejeita Parada com data ausente", () => {
    expect(
      newTripDatesValid("2026-07-01", "2026-07-10", [{ arrive: "2026-07-01", depart: "" }]),
    ).toBe(false);
  });
});
