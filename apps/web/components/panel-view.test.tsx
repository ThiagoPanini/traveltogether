import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ActivePanel } from "@/lib/dashboard/active-panel";
import { PanelView } from "./panel-view";

describe("PanelView (Espresso)", () => {
  it("estado vazio: CTA honesto, sem promessa de vigília automática de preço", () => {
    const panel: ActivePanel = { hero: null, others: [], isEmpty: true };
    const html = renderToStaticMarkup(<PanelView panel={panel} />);

    expect(html).toContain("Criar a primeira viagem");
    expect(html).toContain("/trips/new");
    // Decisão "Frescor da Pesquisa": nada de rastreamento diário automático.
    expect(html).not.toContain("todo dia");
    expect(html).not.toMatch(/vigi/i);
    expect(html).not.toMatch(/sem você pedir/i);
  });

  it("radar pinta 'cotação em breve' por Trajeto e nenhum preço", () => {
    const panel: ActivePanel = {
      isEmpty: false,
      others: [],
      hero: {
        tripId: "eua",
        name: "EUA Trip",
        periodLabel: "01 jul – 15 jul",
        members: [{ seed: "u1", label: "Marina", avatarUrl: null }],
        ribbon: [
          { kind: "city", key: "c1", label: "São Paulo" },
          { kind: "hop", key: "h1", mode: "air" },
          { kind: "city", key: "c2", label: "Nova York" },
        ],
        radar: [{ key: "l1", fromTo: "São Paulo → Nova York", mode: "air", status: "pending" }],
      },
    };
    const html = renderToStaticMarkup(<PanelView panel={panel} />);

    expect(html).toContain("EUA Trip");
    expect(html).toContain("São Paulo → Nova York");
    expect(html).toContain("cotação em breve");
    expect(html).not.toMatch(/R\$|US\$|menor preço/i);
  });
});
