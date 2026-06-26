import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  departure_date: "2026-07-01",
  my_role: "organizer" as const,
  origin: { city: "São Paulo", country: "BR" },
  entry_transfer: { kind: "plane", other_text: null },
  stops: [
    {
      id: "s1",
      position: 0,
      city: "Nova York",
      country: "US",
      arrival_date: "2026-07-02",
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
    ],
    pending_invitations: [{ id: "i1", email: "ana@exemplo.com", role: "member" as const }],
  },
};

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => {
  apiFetch.mockReset();
  notFound.mockReset();
});

describe("/app/viagens/[id] (backbone)", () => {
  it("renderiza nome, rota com destino e a tripulação (membro rico + convite cego)", async () => {
    apiFetch.mockResolvedValue(
      new Response(JSON.stringify(backbone), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    render(await ViagemPage(ctx("t1")));

    expect(screen.getByRole("heading", { name: /costa leste/i })).toBeInTheDocument();
    expect(screen.getByText("Nova York")).toBeInTheDocument();
    expect(screen.getByText("Boston")).toBeInTheDocument();
    expect(screen.getByText(/destino final/i)).toBeInTheDocument();
    // membro aceito: bloco rico com iniciais + nome
    expect(screen.getByText("MA")).toBeInTheDocument();
    expect(screen.getByText(/maria/i)).toBeInTheDocument();
    // convite pendente: cego (só e-mail) + selo pendente
    expect(screen.getByText("ana@exemplo.com")).toBeInTheDocument();
    expect(screen.getByText(/pendente/i)).toBeInTheDocument();
  });

  it("404 da API chama notFound (não vaza existência)", async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(ViagemPage(ctx("missing"))).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFound).toHaveBeenCalled();
  });
});
