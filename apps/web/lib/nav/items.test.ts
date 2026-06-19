import { describe, expect, it } from "vitest";

import { isNavActive, isResolved, NAV_ITEMS, type NavKey } from "./items";

function item(key: NavKey) {
  const found = NAV_ITEMS.find((i) => i.key === key);
  if (!found) throw new Error(`item de nav ausente: ${key}`);
  return found;
}

describe("navegação do casco Espresso", () => {
  it("expõe exatamente três itens, na ordem do protótipo", () => {
    expect(NAV_ITEMS.map((i) => i.key)).toEqual(["inicio", "viagens", "perfil"]);
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(["Início", "Viagens", "Perfil"]);
  });

  it("só Início resolve para uma tela construída (Painel em /overview)", () => {
    expect(item("inicio").href).toBe("/overview");
    expect(isResolved(item("inicio"))).toBe(true);
  });

  it("Viagens e Perfil são inertes — sem destino na rodada 0", () => {
    for (const key of ["viagens", "perfil"] as const) {
      expect(item(key).href).toBeNull();
      expect(isResolved(item(key))).toBe(false);
    }
  });

  it("ativa Início quando a rota é exatamente o href", () => {
    expect(isNavActive(item("inicio"), "/overview")).toBe(true);
  });

  it("ativa Início quando a rota é um sub-caminho", () => {
    expect(isNavActive(item("inicio"), "/overview/algo")).toBe(true);
  });

  it("não ativa por prefixo de string sem fronteira de caminho", () => {
    expect(isNavActive(item("inicio"), "/overviewx")).toBe(false);
  });

  it("item inerte nunca fica ativo, qualquer que seja a rota", () => {
    expect(isNavActive(item("viagens"), "/overview")).toBe(false);
    expect(isNavActive(item("viagens"), "/trips")).toBe(false);
  });
});
