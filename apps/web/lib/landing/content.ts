// Copy da landing (pt-BR, tom coletivo, metáfora de aviação).
// Constantes do projeto: nada de "whatsapp" nem "caça".

export const wordmark = "travel·together";

export const tagline = "Caderno de bordo compartilhado";

export const heroHeadline = [
  "Cadastrem a viagem.",
  "Desenhem as paradas.",
  "Pesquisem o translado.",
] as const;

export const heroSubtitle =
  "O caderno de bordo do grupo: organizem a viagem, tracem as paradas cidade a cidade e decidam o translado entre elas — juntos, sem planilha perdida.";

export type Step = {
  number: string;
  glyph: string;
  title: string;
  body: string;
};

export const steps: Step[] = [
  {
    number: "01",
    glyph: "✦",
    title: "Cadastrem",
    body: "Criem a viagem, definam o período e convidem a tripulação. Cada pessoa entra aceitando o convite.",
  },
  {
    number: "02",
    glyph: "◷",
    title: "Desenhem",
    body: "Tracem as paradas cidade a cidade. O destino é a última parada; o trajeto entre elas aparece sozinho.",
  },
  {
    number: "03",
    glyph: "✈",
    title: "Pesquisem",
    body: "Cadastrem as pesquisas de translado e marquem a preferida. Todo mundo enxerga a decisão de todo mundo.",
  },
];

export const cta = {
  primary: "Criar viagem",
  secondary: "Ver exemplo",
} as const;

export type RibbonLeg = { code: string; city: string };

export const ribbon = {
  label: "EUA Trip",
  meta: "4 viajantes · 14 set → 02 out 2026",
  legs: [
    { code: "GRU", city: "São Paulo" },
    { code: "JFK", city: "Nova York" },
    { code: "MIA", city: "Miami" },
    { code: "MCO", city: "Orlando" },
    { code: "GRU", city: "São Paulo" },
  ] as RibbonLeg[],
};

// Reunido para checagens de a11y/copy em teste.
export const allCopy: string[] = [
  wordmark,
  tagline,
  ...heroHeadline,
  heroSubtitle,
  ...steps.flatMap((s) => [s.title, s.body]),
  cta.primary,
  cta.secondary,
  ribbon.label,
  ribbon.meta,
  ...ribbon.legs.flatMap((l) => [l.code, l.city]),
];
