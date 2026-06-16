import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomePreview } from "./home-preview";

// Mini-painel estático e cativante da Home. Sem backend (página pública,
// deslogada): dados de exemplo embutidos. O ponto do teste: pinta a prévia de
// forma determinística reusando os primitivos de #1 (sem duplicá-los).
describe("HomePreview", () => {
  const html = renderToStaticMarkup(<HomePreview />);

  it("pinta a Viagem de exemplo (nome + rota + pendência)", () => {
    expect(html).toContain("Eurotrip");
    expect(html).toContain("LIS");
    expect(html).toContain("CDG");
    expect(html).toContain("o que precisa de mim");
  });

  it("reusa os primitivos de #1 (StatusPill, MiniRoute, Code)", () => {
    expect(html).toContain("spill"); // StatusPill
    expect(html).toContain("miniroute"); // MiniRoute
    expect(html).toContain("code"); // Code (split-flap)
  });

  it("respeita o glossário (passagem, nunca 'voo')", () => {
    expect(html).not.toMatch(/\bvoos?\b/i);
  });

  it("é determinístico: mesma render → mesma marcação", () => {
    expect(renderToStaticMarkup(<HomePreview />)).toBe(html);
  });
});
