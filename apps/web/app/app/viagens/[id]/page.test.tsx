import { fireEvent, render, screen } from "@testing-library/react";
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
  window.localStorage.clear();
});

afterEach(() => {
  apiFetch.mockReset();
  notFound.mockReset();
  window.localStorage.clear();
});

describe("Painel da viagem — redesign", () => {
  it("mostra breadcrumb, herói, rota e progresso de pesquisas", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    expect(screen.getByRole("link", { name: /painel de bordo/i })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("heading", { level: 1, name: /costa leste/i })).toBeInTheDocument();
    expect(screen.getByText(/organizador · partida são paulo/i)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(
      /São Paulo\s*→\s*Nova York\s*→\s*Boston\s*→\s*Portland/,
    );
    expect(document.body.textContent).toMatch(/4\s*cidades\s*·\s*3\s*trajetos/);
    expect(screen.getByText("Translados pesquisados")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("/ 3")).toBeInTheDocument();
  });

  it("renderiza a linha de trajetos como foco do corpo", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    expect(screen.getByRole("heading", { name: /a linha dos trajetos/i })).toBeInTheDocument();
    expect(screen.getByText("Trajeto 1 de 3")).toBeInTheDocument();
    expect(screen.getAllByText(/São Paulo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nova York/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Trajeto 3 de 3")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\+ pesquisar translado/i })).toHaveLength(3);
    expect(screen.queryByRole("navigation", { name: /vistas da viagem/i })).not.toBeInTheDocument();
  });

  it("aba Tripulação mostra membros e convite pendente mascarado para organizador", async () => {
    apiFetch.mockResolvedValue(ok(backbone));
    render(await ViagemPage(ctx("t1")));

    fireEvent.click(screen.getByRole("button", { name: /tripulação/i }));

    expect(screen.getByRole("heading", { name: /tripulação a bordo/i })).toBeInTheDocument();
    expect(screen.getAllByText(/maria · você/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("João").length).toBeGreaterThan(0);
    expect(screen.getAllByText("an•••••@exemplo.com").length).toBeGreaterThan(0);
    expect(screen.getByText(/convite enviado · aguardando aceite/i)).toBeInTheDocument();
  });

  it("membro não vê convites pendentes mesmo se o payload trouxer", async () => {
    apiFetch.mockResolvedValue(ok({ ...backbone, my_role: "member" }));
    render(await ViagemPage(ctx("t1")));

    expect(screen.queryByText("an•••••@exemplo.com")).not.toBeInTheDocument();
  });

  it("404 da API chama notFound", async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(ViagemPage(ctx("missing"))).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFound).toHaveBeenCalled();
  });
});
