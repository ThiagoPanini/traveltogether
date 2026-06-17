import { describe, expect, it } from "vitest";

import { formatDuration, formatFarePrice, formatPoints, moneyValue } from "./format";

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

describe("formatPoints", () => {
  it("formata pontos com separador de milhar pt-BR e o programa", () => {
    expect(formatPoints(135530, "milhas LATAM")).toBe("135.530 milhas LATAM");
  });
});

describe("formatFarePrice", () => {
  it("só dinheiro quando não há pontos", () => {
    expect(formatFarePrice("242.21", "BRL", null, null)).toBe("R$ 242,21");
  });

  it("pontos + taxa: pontos primeiro, taxa em dinheiro depois, sem conversão", () => {
    expect(formatFarePrice("242.21", "BRL", 135530, "milhas LATAM")).toBe(
      "135.530 milhas LATAM · R$ 242,21",
    );
  });

  it("só pontos: omite a taxa quando o valor é zero", () => {
    expect(formatFarePrice("0", "BRL", 135530, "milhas LATAM")).toBe("135.530 milhas LATAM");
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
