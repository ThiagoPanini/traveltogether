import type { IconName } from "@/components/atlas";

// Copy textual da Home pública, centralizada para virar superfície testável
// (ver content.test.ts). Vocabulário do glossário (pt-BR) e acesso aberto
// (ADR-0013): nada de "voo", "allowlist" ou "beta fechado".

export const HERO = {
  kicker: "planejamento coletivo de viagens",
  headline: "A viagem do grupo, finalmente fora do grupo do zap.",
  sub: "Itinerário, passagens e decisões num lugar só. O grupo vota, o Organizador bate o martelo — e ninguém perde aquela passagem que estava boa.",
  primaryCta: "Organizar uma viagem",
  demoCta: "Ver exemplo",
  finePrint: 'sem planilha · sem 200 mensagens · sem aquele "alguém comprou?"',
} as const;

export interface HomeFeature {
  icon: IconName;
  title: string;
  body: string;
}

export const HOME_FEATURES: HomeFeature[] = [
  {
    icon: "route",
    title: "Itinerário com Paradas",
    body: "Origem, cidades e datas formam a espinha da Viagem. Os Trajetos entre elas aparecem sozinhos.",
  },
  {
    icon: "plane",
    title: "Pesquisas & decisão em grupo",
    body: "Cada um registra as passagens que achou; o grupo dá upvote; o Organizador marca a Escolhida.",
  },
  {
    icon: "checkSquare",
    title: "Tarefas com responsável",
    body: "Quem reserva o hostel? Quem cota o seguro? Tarefa atribuída, prazo e status, sem cobrança no Mural.",
  },
  {
    icon: "wallet",
    title: "Orçamento que se monta sozinho",
    body: "Passagens escolhidas + hospedagem + extras viram um custo estimado por pessoa, por moeda.",
  },
  {
    icon: "activity",
    title: "Cronograma unificado",
    body: "Passagens, estadias e Roteiro numa única linha do tempo — dá pra ver a Viagem inteira de relance.",
  },
  {
    icon: "chat",
    title: "Mural & comentários",
    body: "Discussão ancorada onde importa: numa Pesquisa de Passagem, num item do Roteiro, na Viagem toda.",
  },
];

export const SECTION_FEATS = {
  kicker: "o que você organiza aqui",
  heading: "Uma viagem em grupo tem muita parte móvel. Aqui cada uma tem lugar.",
} as const;

export const CTA_BAND = {
  heading: "Pronto pra tirar a viagem do papel?",
  body: "Crie a Viagem, chame o grupo e deixe as decisões saírem do improviso. Leva cinco minutos pra montar a primeira rota.",
  primaryCta: "Organizar uma viagem",
  demoCta: "Ver exemplo",
} as const;

// Acesso aberto: a conta nasce na hora (ADR-0013). Substitui o antigo
// "mvp · acesso por allowlist" do protótipo.
export const FOOTER_NOTE = "acesso aberto · sua conta nasce na hora";
