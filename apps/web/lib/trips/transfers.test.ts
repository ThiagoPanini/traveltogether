import { describe, expect, it } from "vitest";
import { isTransferDefined, TRANSFER_TYPES, transferLabel } from "./transfers";

describe("transferLabel", () => {
  it("rotula um tipo concreto", () => {
    expect(transferLabel({ kind: "plane" })).toBe("Avião");
  });

  it("usa o texto livre quando 'other'", () => {
    expect(transferLabel({ kind: "other", otherText: "Carona" })).toBe("Carona");
  });

  it("'other' sem texto cai no rótulo 'Outro'", () => {
    expect(transferLabel({ kind: "other" })).toBe("Outro");
  });

  it("null vira 'Indefinido'", () => {
    expect(transferLabel(null)).toBe("Indefinido");
  });
});

describe("isTransferDefined", () => {
  it("undecided e null não estão definidos", () => {
    expect(isTransferDefined(null)).toBe(false);
    expect(isTransferDefined({ kind: "undecided" })).toBe(false);
  });

  it("tipo concreto está definido", () => {
    expect(isTransferDefined({ kind: "bus" })).toBe(true);
  });
});

describe("TRANSFER_TYPES", () => {
  it("marca a pé e carro próprio como não-cotáveis", () => {
    const naoCotaveis = TRANSFER_TYPES.filter((t) => !t.quotable).map((t) => t.kind);
    expect(naoCotaveis).toEqual(expect.arrayContaining(["on_foot", "own_car"]));
  });
});
