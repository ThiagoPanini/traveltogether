import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DemoOverlay } from "./demo-overlay";

// O DemoOverlay (#137) pinta o Painel real (chassi Espresso) em prévia
// somente-leitura sobre a fixture de exemplo, sem login. Sem jsdom no setup,
// testamos a marcação estática: chrome correto, Painel pintado e navegação
// inerte. Fechar por Esc/backdrop é comportamento de cliente, fora do SSR.

describe("DemoOverlay", () => {
  it("pinta o Painel de exemplo (Eurotrip) em prévia somente-leitura", () => {
    const html = renderToStaticMarkup(<DemoOverlay onClose={() => {}} />);
    expect(html).toContain("Eurotrip do grupo");
    expect(html).toContain("cotação em breve");
    expect(html).toContain("somente leitura");
  });

  it("oferece o CTA Entrar para usar apontando para /login", () => {
    const html = renderToStaticMarkup(<DemoOverlay onClose={() => {}} />);
    expect(html).toContain("Entrar para usar");
    expect(html).toContain('href="/login"');
  });

  it("mantém a navegação do Painel inerte (só o CTA leva a /login)", () => {
    const html = renderToStaticMarkup(<DemoOverlay onClose={() => {}} />);
    for (const route of ['href="/trips', 'href="/overview"', 'href="/tasks"', 'href="/activity"']) {
      expect(html).not.toContain(route);
    }
  });

  it("é um diálogo acessível com botão de fechar rotulado", () => {
    const html = renderToStaticMarkup(<DemoOverlay onClose={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Fechar"');
  });
});
