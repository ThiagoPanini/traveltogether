import { describe, expect, it } from "vitest";

import { anchorLabel, isAnchored } from "./mural";

describe("anchorLabel", () => {
  it("Comentário de alvo Viagem não tem âncora", () => {
    expect(anchorLabel("trip")).toBeNull();
  });

  it("ancorado a Pesquisa/Item ganha rótulo do tipo de alvo", () => {
    expect(anchorLabel("fare_quote")).toBe("Pesquisa de Passagem");
    expect(anchorLabel("itinerary_item")).toBe("Item de Roteiro");
  });
});

describe("isAnchored", () => {
  it("só alvos diferentes de Viagem são ancorados (read-only no mural)", () => {
    expect(isAnchored("trip")).toBe(false);
    expect(isAnchored("fare_quote")).toBe(true);
    expect(isAnchored("itinerary_item")).toBe(true);
  });
});
