import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("./actions", () => ({ logout: vi.fn() }));

import AppHome from "./page";

afterEach(() => {
  auth.mockReset();
});

describe("/app (home empty-state)", () => {
  it("saúda pelo nome de quem está logado", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });

    render(await AppHome());

    expect(screen.getByRole("heading", { name: /olá, maria/i })).toBeInTheDocument();
  });

  it("anuncia em uma linha honesta que criar viagem está chegando", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });

    render(await AppHome());

    expect(screen.getByText(/criar viagem está chegando/i)).toBeInTheDocument();
  });

  it("não exibe grade global de features 'em breve'", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });

    render(await AppHome());

    expect(screen.queryByRole("list")).toBeNull();
  });

  it("oferece a ação de sair (logout)", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });

    render(await AppHome());

    expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument();
  });

  it("não quebra para sessão sem nome — saúda genericamente", async () => {
    auth.mockResolvedValue({ user: {} });

    render(await AppHome());

    expect(screen.getByRole("heading", { name: /olá, viajante/i })).toBeInTheDocument();
  });
});
