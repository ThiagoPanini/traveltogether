import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { auth, apiFetch } = vi.hoisted(() => ({
  auth: vi.fn(),
  apiFetch: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/bff/server", () => ({ apiFetch }));
vi.mock("./actions", () => ({ logout: vi.fn() }));

import AppHome from "./page";

function meResponse(profile: { display_name?: string | null; origin_city?: string | null } | null) {
  return new Response(JSON.stringify({ profile }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  auth.mockReset();
  apiFetch.mockReset();
});

describe("/app (home foco-central)", () => {
  it("exibe h1 'Nenhuma viagem ainda' como estado vazio central", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    apiFetch.mockResolvedValue(meResponse({ display_name: "Maria", origin_city: "São Paulo" }));

    render(await AppHome());

    expect(screen.getByRole("heading", { name: /nenhuma viagem ainda/i })).toBeInTheDocument();
  });

  it("mostra o nome e a cidade de origem do perfil no header", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    apiFetch.mockResolvedValue(
      meResponse({ display_name: "Maria Souza", origin_city: "Curitiba" }),
    );

    render(await AppHome());

    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getByText("Curitiba")).toBeInTheDocument();
  });

  it("oculta a cidade de origem quando não está no perfil", async () => {
    auth.mockResolvedValue({ user: { name: "Ana" } });
    apiFetch.mockResolvedValue(meResponse({ display_name: "Ana", origin_city: null }));

    render(await AppHome());

    expect(screen.queryByText(/curitiba/i)).not.toBeInTheDocument();
  });

  it("exibe avatar com a inicial maiúscula do nome", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    apiFetch.mockResolvedValue(meResponse({ display_name: "Maria", origin_city: null }));

    render(await AppHome());

    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("oferece a ação de sair (logout)", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    apiFetch.mockResolvedValue(meResponse({ display_name: "Maria", origin_city: null }));

    render(await AppHome());

    expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument();
  });

  it("CTA 'Criar primeira viagem' está desabilitado (em breve)", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    apiFetch.mockResolvedValue(meResponse({ display_name: "Maria", origin_city: null }));

    render(await AppHome());

    const cta = screen.getByRole("button", { name: /criar primeira viagem/i });
    expect(cta).toBeDisabled();
    expect(screen.getByText(/em breve/i)).toBeInTheDocument();
  });

  it("usa 'viajante' como fallback quando perfil e sessão não têm nome", async () => {
    auth.mockResolvedValue({ user: {} });
    apiFetch.mockResolvedValue(meResponse({ display_name: null, origin_city: null }));

    render(await AppHome());

    expect(screen.getByText("viajante")).toBeInTheDocument();
  });

  it("usa nome da sessão quando API falha", async () => {
    auth.mockResolvedValue({ user: { name: "João" } });
    apiFetch.mockResolvedValue(new Response(null, { status: 500 }));

    render(await AppHome());

    expect(screen.getByText("João")).toBeInTheDocument();
  });
});
