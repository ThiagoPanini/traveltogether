import { describe, expect, it } from "vitest";

import { formatDuration, moneyValue } from "./format";

describe("moneyValue", () => {
  it("interpreta ponto como separador decimal", () => {
    expect(moneyValue("1234.56")).toBe(1234.56);
  });

  it("interpreta formato pt-BR com milhar e vírgula decimal", () => {
    expect(moneyValue("1.234,56")).toBe(1234.56);
  });

  it("interpreta vírgula isolada como decimal", () => {
    expect(moneyValue("1234,56")).toBe(1234.56);
  });

  it("valor inválido vira +Infinity (ordena por último)", () => {
    expect(moneyValue("abc")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("formatDuration", () => {
  it("horas cheias sem minutos", () => {
    expect(formatDuration(120)).toBe("2h");
  });

  it("minutos com zero à esquerda", () => {
    expect(formatDuration(125)).toBe("2h05");
  });
});
