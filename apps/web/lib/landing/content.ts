// Copy da landing (pt-BR, tom coletivo, metáfora de aviação).
// Constantes do projeto: nada de "whatsapp" nem "caça".

export const wordmark = "travel·manager";

// ── Topo: navegação + herói ──────────────────────────────────────────────────
export const nav = {
  entrar: "Entrar",
} as const;

export const heroEyebrow = "Te ajudando a organizar sua viagem";

// Headline em segmentos: as palavras em destaque herdam a cor de acento.
export type HeadlineSegment = { text: string; accent?: boolean };

export const heroHeadline: HeadlineSegment[] = [
  { text: "Organizando viagens de maneira " },
  { text: "fácil", accent: true },
  { text: " e " },
  { text: "rápida", accent: true },
];

export const heroSubtitle =
  "De viagens internacionais até passeios ao interior. Sozinho ou em grupo. Conte com o travel·manager para centralizar os itens essenciais e tornar o processo de organização mais tranquilo.";

// ── Como funciona: três passos para começar ──────────────────────────────────
export const comoFunciona = {
  eyebrow: "Por onde começar",
  title: "Comece em três passos",
  intro: "Três passos para iniciar sua jornada.",
} as const;

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
    title: "Crie uma conta",
    body: "Entre com seu e-mail ou Google. Em segundos você tem um lugar para guardar todas as suas viagens.",
  },
  {
    number: "02",
    glyph: "◷",
    title: "Cadastre uma viagem",
    body: "Dê um nome, escolha o período e convide quem vai junto. Cada viagem vira um espaço só do grupo.",
  },
  {
    number: "03",
    glyph: "✈",
    title: "Organize",
    body: "Trace as paradas, compare os trajetos e acompanhe tudo num lugar só — do voo internacional ao passeio no interior.",
  },
];

// ── Rodapé ───────────────────────────────────────────────────────────────────
export const footer = {
  caption: "Organize a viagem com o grupo todo",
} as const;

// ── Camadas de scroll ───────────────────────────────────────────────────────
// Continuação nativa abaixo da dobra: revela o modelo de domínio por baixo do
// herói — Parada → Trajeto → Rota → decisão por-pessoa → marca. Cada camada
// respeita os invariantes de CONTEXT.md (decisão sem eleição, Trajeto derivado e
// sem preço, aeroporto só na Rota/Trecho).

// 01 · O esqueleto — as Paradas, com o destino derivado da última.
export type ParadaNode = { city: string; role: string; tone: "origem" | "stop" | "destino" };

export const layerParadas = {
  eyebrow: "01 — O esqueleto",
  title: "Toda viagem começa pelas paradas",
  body: "As cidades, na ordem em que vocês vão ficar. A última parada é o destino — ele aparece sozinho.",
  nodes: [
    { city: "São Paulo", role: "sua origem", tone: "origem" },
    { city: "Nova York", role: "parada 01", tone: "stop" },
    { city: "Miami", role: "parada 02", tone: "stop" },
    { city: "Orlando", role: "★ destino", tone: "destino" },
  ] as ParadaNode[],
};

// 02 · O que ligar — o Trajeto, derivado e sem preço.
export const layerTrajeto = {
  eyebrow: "02 — O que ligar",
  title: "Entre as paradas, os trajetos",
  body: "O salto a vencer de uma cidade à outra. Vocês não cadastram: ele é derivado da ordem das paradas.",
  from: "São Paulo",
  to: "Nova York",
  note: "Trajeto · agrupa os caminhos possíveis · não tem preço",
};

// 03 · As opções — Rotas alternativas; aqui surgem os códigos de aeroporto.
export type RouteOption = {
  name: string;
  badge: string;
  tone: "success" | "warning";
  hops: string[];
  body: string;
};

export const layerRotas = {
  eyebrow: "03 — As opções",
  title: "Cada trajeto, mais de um caminho",
  body: "Direto ou por outra cidade. Vocês desenham as rotas e comparam lado a lado — aqui é onde os códigos de aeroporto aparecem.",
  options: [
    {
      name: "Rota direta",
      badge: "1 compra",
      tone: "success",
      hops: ["GRU", "JFK"],
      body: "Um trecho só, do começo ao fim. Uma passagem para cada pessoa.",
    },
    {
      name: "Via Miami",
      badge: "2 compras",
      tone: "warning",
      hops: ["GRU", "MIA", "JFK"],
      body: "Dois trechos, dois bilhetes. Miami é o ponto entre eles — não uma parada do grupo.",
    },
  ] as RouteOption[],
};

// 04 · A decisão — Preferida pessoal, sem voto de grupo (invariante 4).
export type CrewChoice = {
  initial: string;
  name: string;
  role: string;
  status: string;
  tone: "success" | "accent" | "muted";
};

export const layerDecisao = {
  eyebrow: "04 — A decisão",
  title: "A decisão é de cada um",
  body: "Sem votação, sem rota escolhida pelo grupo. Cada pessoa marca a sua preferida — e enxerga a de todo mundo.",
  trajetoLabel: "São Paulo → Nova York",
  crew: [
    {
      initial: "A",
      name: "Ana",
      role: "organizadora",
      status: "preferiu a direta",
      tone: "success",
    },
    { initial: "B", name: "Bruno", role: "membro", status: "prefere a via Miami", tone: "accent" },
    { initial: "C", name: "Carla", role: "membro", status: "comprou a direta", tone: "success" },
    { initial: "D", name: "Diego", role: "membro", status: "sem preferida", tone: "muted" },
  ] as CrewChoice[],
  footnote: "A contagem mostra para onde o grupo tende. Ela não decide por ninguém.",
};

// 05 · A marca — fecho da narrativa com a chamada de conversão.
export const layerMarca = {
  title: ["Da ideia à viagem,", "num lugar só"],
  body: "Sozinho ou em grupo — cada parada, cada trajeto e cada decisão organizados no mesmo lugar.",
  cta: "Criar uma conta",
};

// Reunido para checagens de a11y/copy em teste.
export const allCopy: string[] = [
  wordmark,
  nav.entrar,
  heroEyebrow,
  ...heroHeadline.map((s) => s.text),
  heroSubtitle,
  comoFunciona.eyebrow,
  comoFunciona.title,
  comoFunciona.intro,
  ...steps.flatMap((s) => [s.title, s.body]),
  footer.caption,
  layerParadas.title,
  layerParadas.body,
  ...layerParadas.nodes.flatMap((n) => [n.city, n.role]),
  layerTrajeto.title,
  layerTrajeto.body,
  layerTrajeto.note,
  layerRotas.title,
  layerRotas.body,
  ...layerRotas.options.flatMap((o) => [o.name, o.badge, o.body, ...o.hops]),
  layerDecisao.title,
  layerDecisao.body,
  layerDecisao.trajetoLabel,
  ...layerDecisao.crew.flatMap((c) => [c.name, c.role, c.status]),
  layerDecisao.footnote,
  ...layerMarca.title,
  layerMarca.body,
  layerMarca.cta,
];
