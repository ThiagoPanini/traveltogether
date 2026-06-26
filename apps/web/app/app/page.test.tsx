import { render, screen } from "@testing-library/react";
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

describe("/app (home da Fase 3)", () => {
  it("sem viagens, mostra o empty-state e o CTA 'Criar viagem' linkando pro wizard", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({ profile: { display_name: "Maria", origin_city: "São Paulo" }, trips: [] });

    render(await AppHome());

    expect(screen.getByRole("heading", { name: /nenhuma viagem ainda/i })).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /criar viagem/i });
    expect(cta).toHaveAttribute("href", "/app/viagens/nova");
  });

  it("mostra o nome e a cidade de origem do perfil no header", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({ profile: { display_name: "Maria Souza", origin_city: "Curitiba" } });

    render(await AppHome());

    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getByText("Curitiba")).toBeInTheDocument();
  });

  it("exibe avatar com a inicial maiúscula do nome", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({ profile: { display_name: "Maria", origin_city: null } });

    render(await AppHome());

    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("oferece a ação de sair (logout)", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    mockApi({ profile: { display_name: "Maria", origin_city: null } });

    render(await AppHome());

    expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument();
  });

  it("usa 'viajante' como fallback quando perfil e sessão não têm nome", async () => {
    auth.mockResolvedValue({ user: {} });
    mockApi({ profile: { display_name: null, origin_city: null } });

    render(await AppHome());

    expect(screen.getByText("viajante")).toBeInTheDocument();
  });

  it("lista as viagens que participo com link pro backbone", async () => {
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

    expect(screen.getByText("Costa Leste")).toBeInTheDocument();
    expect(screen.getByText("Nova York")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /costa leste/i })).toHaveAttribute(
      "href",
      "/app/viagens/t1",
    );
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

    expect(screen.getByText("Road Trip")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aceitar/i })).toBeInTheDocument();
  });
});
