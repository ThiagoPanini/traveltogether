import type { ActivePanel } from "../dashboard/active-panel";

// Painel de exemplo da Home (DemoOverlay #137), chassi Espresso. Literal
// estático — a "Eurotrip do grupo": São Paulo → Lisboa → Paris → Roma → de
// volta, 4 viajantes, tudo aéreo. Sem API, sem sessão, sem seed: alimenta o
// `<PanelView panel />` em prévia somente-leitura (cliques desligados pelo
// overlay). Na rodada 0 o radar é esqueleto — toda linha "cotação em breve".
const CITIES = ["São Paulo", "Lisboa", "Paris", "Roma", "São Paulo"];

export const EXAMPLE_ACTIVE_PANEL: ActivePanel = {
  isEmpty: false,
  others: [{ id: "demo-andes", name: "Volta nos Andes", tag: "sem data" }],
  hero: {
    tripId: "demo-eurotrip",
    name: "Eurotrip do grupo",
    periodLabel: "10 set – 24 set",
    members: [
      { seed: "demo-1", label: "Marina", avatarUrl: null },
      { seed: "demo-2", label: "Thiago", avatarUrl: null },
      { seed: "demo-3", label: "Bea", avatarUrl: null },
      { seed: "demo-4", label: "Caio", avatarUrl: null },
    ],
    ribbon: CITIES.flatMap((city, i) => [
      ...(i > 0 ? [{ kind: "hop" as const, key: `demo-hop-${i}`, mode: "air" as const }] : []),
      { kind: "city" as const, key: `demo-city-${i}`, label: city },
    ]),
    radar: [
      { key: "demo-l1", fromTo: "São Paulo → Lisboa", mode: "air", status: "pending" },
      { key: "demo-l2", fromTo: "Lisboa → Paris", mode: "air", status: "pending" },
      { key: "demo-l3", fromTo: "Paris → Roma", mode: "air", status: "pending" },
      { key: "demo-l4", fromTo: "Roma → São Paulo", mode: "air", status: "pending" },
    ],
  },
};
