import { render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, notFound } = vi.hoisted(() => ({ apiFetch: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/bff/server", () => ({ apiFetch }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    notFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import ViagemPage from "./page";

/** Backbone visto por um Organizador, com translados parcialmente propostos. */
const backbone = {
  id: "t1",
  name: "Costa Leste",
  description: "Subindo a costa sem pressa",
  departure_date: "2026-07-08",
  my_role: "organizer" as const,
  origin: { city: "São Paulo", country: "BR" },
  entry_transfer: { kind: "plane", other_text: null },
  stops: [
    {
      id: "s1",
      position: 0,
      city: "Nova York",
      country: "US",
      arrival_date: "2026-07-09",
      desired_transfer: null,
    },
    {
      id: "s2",
      position: 1,
      city: "Boston",
      country: "US",
      arrival_date: null,
      desired_transfer: { kind: "train", other_text: null },
    },
    {
      id: "s3",
      position: 2,
      city: "Portland",
      country: "US",
      arrival_date: null,
      desired_transfer: { kind: "undecided", other_text: null },
    },
  ],
  crew: {
    members: [
      {
        display_name: "Maria",
        initials: "MA",
        city: "São Paulo",
        role: "organizer" as const,
        is_me: true,
      },
      {
        display_name: "João",
        initials: "JO",
        city: "Recife",
        role: "member" as const,
        is_me: false,
      },
    ],
    pending_invitations: [{ id: "i1", email: "ana@exemplo.com", role: "member" as const }],
  },
};

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  // Congela "hoje" para a contagem de embarque ser determinística (8 jul − 1 jul = 7).
  // Fakeia só `Date` — fakear timers/microtasks travaria o `await res.json()` da página.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 6, 1));
});

afterEach(() => {
  vi.useRealTimers();
  apiFetch.mockReset();
  notFound.mockReset();
});

describe("Painel da viagem — herói", () => {
  it("mostra partida, nome, paradas em ordem, nº de viajantes e a contagem de embarque", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    expect(screen.getByRole("heading", { level: 1, name: /costa leste/i })).toBeInTheDocument();
    expect(screen.getByText("parte 08 jul 2026")).toBeInTheDocument();
    expect(screen.getByText(/nova york → boston → portland/i)).toBeInTheDocument();
    expect(screen.getByText(/2 viajantes/)).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(/dias p\/ embarque/i)).toBeInTheDocument();
  });

  it("sem data de partida: eyebrow 'datas a definir' e sem contador", async () => {
    apiFetch.mockResolvedValue(ok({ ...backbone, departure_date: null }));
    render(await ViagemPage(ctx("t1")));

    expect(screen.getByText("datas a definir")).toBeInTheDocument();
    expect(screen.queryByText(/dias p\/ embarque/i)).not.toBeInTheDocument();
  });
});

describe("Painel da viagem — avanço dos translados", () => {
  it("mede os trajetos compartilhados propostos, com % e contador de pendências", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    const bar = screen.getByRole("progressbar", {
      name: /1 de 2 trajetos compartilhados com translado proposto/i,
    });
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "2");
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/1 em discussão/i)).toBeInTheDocument();
  });

  it("esconde a faixa quando não há trajeto compartilhado (1 parada só)", async () => {
    apiFetch.mockResolvedValue(ok({ ...backbone, stops: [backbone.stops[0]] }));
    render(await ViagemPage(ctx("t1")));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

describe("Painel da viagem — tabs e switcher", () => {
  it("tabs do topo: Painel ativo (aria-current) + cascas em breve", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    const tabs = screen.getByRole("navigation", { name: /seções da viagem/i });
    expect(within(tabs).getByText("Painel")).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByText(/roteiro/i)).toHaveAttribute("aria-disabled", "true");
    expect(within(tabs).getByText(/orçamento/i)).toBeInTheDocument();
    expect(within(tabs).getByText(/ingressos/i)).toBeInTheDocument();
  });

  it("bottom switcher: Painel ativo + Rotas em breve", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    const switcher = screen.getByRole("navigation", { name: /vistas da viagem/i });
    expect(within(switcher).getByText("Painel")).toHaveAttribute("aria-current", "page");
    expect(within(switcher).getByText(/rotas/i)).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Painel da viagem — tripulação", () => {
  it("lista membros por papel (você marcado) e os convites pendentes ao Organizador", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    expect(screen.getByText("Maria (você)")).toBeInTheDocument();
    expect(screen.getByText("organiza")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(screen.getByText("membro")).toBeInTheDocument();
    // convite cego: subgrupo "Aguardando aceite" + e-mail + status
    expect(screen.getByText(/aguardando aceite/i)).toBeInTheDocument();
    expect(screen.getByText("ana@exemplo.com")).toBeInTheDocument();
    expect(screen.getByText("aguardando")).toBeInTheDocument();
  });

  it("convite cego: um Membro não vê os pendentes (mesmo se o payload os trouxer)", async () => {
    apiFetch.mockResolvedValue(ok({ ...backbone, my_role: "member" }));
    render(await ViagemPage(ctx("t1")));

    expect(screen.queryByText(/aguardando aceite/i)).not.toBeInTheDocument();
    expect(screen.queryByText("ana@exemplo.com")).not.toBeInTheDocument();
  });
});

describe("Painel da viagem — linha do tempo", () => {
  it("deriva sua ida + compartilhados + sua volta-semente, com as pílulas de estado", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    const section = screen.getByRole("heading", { name: /linha do tempo/i }).closest("section");
    expect(section).not.toBeNull();
    const tl = within(section as HTMLElement);
    // sua ida (avião) · compartilhado proposto (trem) · compartilhado em discussão · volta-semente
    expect(tl.getByText("sua ida")).toBeInTheDocument();
    expect(tl.getByText("proposto: Avião")).toBeInTheDocument();
    expect(tl.getByText("proposto: Trem")).toBeInTheDocument();
    expect(tl.getByText("em discussão")).toBeInTheDocument();
    expect(tl.getByText("sua volta")).toBeInTheDocument();
    expect(tl.getByText("emerge na pesquisa")).toBeInTheDocument();
    // a composição derivação→render chega na linha: a nota da volta-semente (conteúdo único)
    expect(tl.getByText(/a volta emerge quando alguém pesquisar/i)).toBeInTheDocument();
    // as pontas/compartilhados oferecem o CTA desabilitado; a volta-semente não
    expect(tl.getAllByText(/pesquisa de translado · em breve/i).length).toBe(3);
  });
});

describe("Painel da viagem — cascas e 404", () => {
  it("mostra os cards 'em breve' (Roteiro/Orçamento/Ingressos)", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    const soon = screen.getByRole("heading", { name: /em breve nesta viagem/i }).parentElement;
    expect(soon).not.toBeNull();
    expect(within(soon as HTMLElement).getByText("Roteiro")).toBeInTheDocument();
    expect(within(soon as HTMLElement).getByText("Orçamento")).toBeInTheDocument();
    expect(within(soon as HTMLElement).getByText("Ingressos")).toBeInTheDocument();
    expect(within(soon as HTMLElement).getAllByText("em breve")).toHaveLength(3);
  });

  it("404 da API chama notFound (não vaza existência)", async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(ViagemPage(ctx("missing"))).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFound).toHaveBeenCalled();
  });
});
