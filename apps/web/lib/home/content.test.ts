import { describe, expect, it } from "vitest";

import { CTA_BAND, FOOTER_NOTE, HERO, HOME_FEATURES, SECTION_FEATS } from "./content";

// Toda a copy textual da Home pública num só lugar — superfície testável do
// slice. O ponto do guard: a Home nasceu de um protótipo que viola o glossário
// ("os voos que achou", "perde aquele voo") e prometia "acesso por allowlist".
// Esta suíte é a rede que impede a copy proibida de voltar (ADR-0013 acesso
// aberto · CONTEXT.md termos proibidos).

// Junta toda a copy num bloco só para varrer termos proibidos de uma vez.
const allCopy = [
  HERO.kicker,
  HERO.headline,
  HERO.sub,
  HERO.primaryCta,
  HERO.demoCta,
  HERO.finePrint,
  SECTION_FEATS.kicker,
  SECTION_FEATS.heading,
  ...HOME_FEATURES.flatMap((f) => [f.title, f.body]),
  CTA_BAND.heading,
  CTA_BAND.body,
  CTA_BAND.primaryCta,
  CTA_BAND.demoCta,
  FOOTER_NOTE,
].join("\n");

describe("copy da Home (glossário + acesso aberto)", () => {
  it("não usa termos proibidos do glossário (voo/proposta/etapa/like)", () => {
    for (const term of [/\bvoos?\b/i, /\bproposta/i, /\betapa/i, /\blike\b/i]) {
      expect(allCopy).not.toMatch(term);
    }
  });

  it("não gateia por allowlist/convite nem fala em beta fechado", () => {
    for (const term of [/allowlist/i, /beta fechado/i, /por convite/i, /acesso por convite/i]) {
      expect(allCopy).not.toMatch(term);
    }
  });

  it("promete acesso aberto no rodapé", () => {
    expect(FOOTER_NOTE).toMatch(/acesso aberto/i);
  });
});

describe("feature cards da Home", () => {
  it("tem exatamente 6 cards", () => {
    expect(HOME_FEATURES).toHaveLength(6);
  });

  it("cobre as 6 superfícies da Fase 2 pelo título", () => {
    const titles = HOME_FEATURES.map((f) => f.title).join(" · ");
    for (const surface of [
      "Itinerário",
      "Pesquisas",
      "Tarefas",
      "Orçamento",
      "Cronograma",
      "Mural",
    ]) {
      expect(titles).toContain(surface);
    }
  });
});
