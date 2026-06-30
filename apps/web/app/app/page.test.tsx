import { render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { auth, apiFetch } = vi.hoisted(() => ({
  auth: vi.fn(),
  apiFetch: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/bff/server", () => ({ apiFetch }));
vi.mock("./actions", () => ({ logout: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import AppHome from "./page";

type Profile = { display_name?: string | null; origin_city?: string | null } | null;

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function mockApi(opts: { profile?: Profile; trips?: unknown[]; invitations?: unknown[] }) {
  apiFetch.mockImplementation((path: string) => {
    if (path === "/auth/me") return Promise.resolve(json({ profile: opts.profile ?? null }));
    if (path === "/trips") return Promise.resolve(json(opts.trips ?? []));
    if (path === "/invitations") return Promise.resolve(json(opts.invitations ?? []));
    return Promise.resolve(new Response(null, { status: 404 }));
  });
}

afterEach(() => {
  auth.mockReset();
  apiFetch.mockReset();
});

describe("/app (painel de bordo)", () => {
  it("sem viagens, mostra o empty-state guiado e o CTA da primeira viagem", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({ profile: { display_name: "Maria", origin_city: "São Paulo" }, trips: [] });

    render(await AppHome());

    expect(screen.getByRole("heading", { name: /nenhuma viagem no radar/i })).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /criar primeira viagem/i });
    expect(cta).toHaveAttribute("href", "/app/viagens/nova");
  });

  it("mostra o nome e a cidade de origem no resumo mobile", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({ profile: { display_name: "Maria Souza", origin_city: "Curitiba" } });

    render(await AppHome());

    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getAllByText("Curitiba").length).toBeGreaterThan(0);
  });

  it("exibe avatar com a inicial maiúscula do nome", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({ profile: { display_name: "Maria", origin_city: null } });

    render(await AppHome());

    expect(screen.getAllByText("M").length).toBeGreaterThan(0);
  });

  it("usa 'viajante' como fallback quando perfil e sessão não têm nome", async () => {
    auth.mockResolvedValue({ user: {} });
    mockApi({ profile: { display_name: null, origin_city: null } });

    render(await AppHome());

    expect(screen.getAllByText("viajante").length).toBeGreaterThan(0);
  });

  it("lista as viagens que participo em cartões com link pro painel da viagem", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({
      profile: { display_name: "Maria", origin_city: "São Paulo" },
      trips: [
        {
          id: "t1",
          name: "Costa Leste",
          destination_city: "Nova York",
          stop_count: 3,
          my_role: "organizer",
        },
      ],
    });

    render(await AppHome());

    const trip = screen.getByRole("link", { name: /costa leste/i });
    expect(within(trip).getByText("Costa Leste")).toBeInTheDocument();
    expect(trip).toHaveTextContent(/São Paulo\s*→\s*Nova York/);
    expect(trip).toHaveAttribute("href", "/app/viagens/t1");
  });

  it("resume viagens, paradas, papel de Organizador e convites com dados reais", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({
      profile: { display_name: "Maria", origin_city: "São Paulo" },
      trips: [
        {
          id: "t1",
          name: "Costa Leste",
          destination_city: "Nova York",
          stop_count: 3,
          my_role: "organizer",
        },
        {
          id: "t2",
          name: "Sul",
          destination_city: "Bariloche",
          stop_count: 2,
          my_role: "member",
        },
      ],
      invitations: [
        {
          id: "i1",
          trip_id: "t9",
          trip_name: "Road Trip",
          role: "member",
          invited_by_name: "Ana",
        },
      ],
    });

    render(await AppHome());

    const metrics = screen.getByLabelText("Resumo do painel");
    expect(within(metrics).getByText("02")).toBeInTheDocument();
    expect(within(metrics).getByText("São Paulo")).toBeInTheDocument();
    expect(within(metrics).getByText("Organiza")).toBeInTheDocument();
    expect(screen.getAllByText("Convites").length).toBeGreaterThan(0);
    const invitesTitle = screen.getByRole("heading", { name: "Convites" }).parentElement;
    expect(invitesTitle).not.toBeNull();
    expect(within(invitesTitle as HTMLElement).getByText("1")).toBeInTheDocument();
  });

  it("mostra os convites pendentes com botão de aceitar", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({
      profile: { display_name: "Maria", origin_city: null },
      invitations: [
        {
          id: "i1",
          trip_id: "t9",
          trip_name: "Road Trip",
          role: "member",
          invited_by_name: "Ana",
        },
      ],
    });

    render(await AppHome());

    expect(screen.getByText(/convidou · road trip/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aceitar/i })).toBeInTheDocument();
  });
});
