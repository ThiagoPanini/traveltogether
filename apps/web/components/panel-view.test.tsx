import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PanelData } from "@/lib/dashboard/panel-data";
import { PanelView } from "./panel-view";

// PanelData estático — o ponto do seam: renderização determinística a partir
// das props, sem fetch nem sessão. Tudo que a tela mostra vem daqui.
const data: PanelData = {
  greeting: "Bom dia, Thiago.",
  todayLabel: "ter, 16 jun",
  waitingLabel: "1 coisa esperando você",
  alerts: [
    {
      icon: "compass",
      title: "Marcar a Escolhida",
      sub: "GRU → LIS · Portugal",
      href: "/trips/t1/legs/l1",
    },
  ],
  hero: {
    tripId: "t1",
    name: "Portugal",
    status: "planning",
    coverSeed: "Portugal",
    coverCode: "GRU",
    rangeLabel: "01 jul – 08 jul",
    nights: 7,
    countdown: { kind: "days", days: 15 },
    routeCodes: ["GRU", "LIS", "GRU"],
    members: [{ seed: "u1", label: "Thiago" }],
    legsChosen: 1,
    legsTotal: 2,
    openTasks: 3,
    perPersonLabel: "R$ 1.200,00",
    href: "/trips/t1",
  },
  activity: [
    {
      id: "a1",
      kindLabel: "comentou",
      actorName: "Bia",
      body: "comentou no Mural",
      tripName: "Portugal",
      href: "/trips/t1",
    },
  ],
  tasks: [
    {
      id: "k1",
      title: "Reservar hostel",
      statusLabel: "a fazer",
      tripName: "Portugal",
      href: "/trips/t1/t/tasks",
    },
  ],
  notifications: [{ id: "n1", icon: "users", text: "Você foi convidado", href: "/trips/t1" }],
  unreadCount: 1,
  budget: {
    tripName: "Portugal",
    rows: [
      { currency: "BRL", perPersonValue: 1200, perPerson: "R$ 1.200,00", perGroup: "R$ 2.400,00" },
    ],
    href: "/trips/t1/t/budget",
  },
  hasTrips: true,
  pendingCount: 1,
  taskCount: 1,
};

describe("PanelView (read-only)", () => {
  const html = renderToStaticMarkup(<PanelView data={data} readOnly />);

  it("pinta os dados derivados (saudação, hero, alerta, aviso, orçamento)", () => {
    expect(html).toContain("Bom dia, Thiago.");
    expect(html).toContain("Portugal");
    expect(html).toContain("Marcar a Escolhida");
    expect(html).toContain("Você foi convidado");
    expect(html).toContain("R$ 1.200,00");
  });

  it("não navega no modo read-only (nenhum href emitido)", () => {
    expect(html).not.toContain("href=");
  });

  it("é determinístico: mesma prop → mesma marcação", () => {
    expect(renderToStaticMarkup(<PanelView data={data} readOnly />)).toBe(html);
  });

  it("sem próxima Viagem, não renderiza o hero", () => {
    const noHero = renderToStaticMarkup(
      <PanelView data={{ ...data, hero: null, budget: null }} readOnly />,
    );
    expect(noHero).not.toContain("embarque em");
  });
});
