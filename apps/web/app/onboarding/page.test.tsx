import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { auth, apiFetch, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  apiFetch: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/bff/server", () => ({ apiFetch }));
vi.mock("next/navigation", () => ({
  redirect,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next-auth/react", () => ({ useSession: () => ({ update: vi.fn() }) }));

import OnboardingPage from "./page";

function meResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  auth.mockReset();
  apiFetch.mockReset();
  redirect.mockClear();
});

describe("/onboarding (gate + prefill)", () => {
  it("sem sessão manda para o login e nem consulta a API", async () => {
    auth.mockResolvedValue(null);

    await expect(OnboardingPage()).rejects.toThrow("REDIRECT:/entrar");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("usuário já onboardado é desviado para o /app", async () => {
    auth.mockResolvedValue({ user: { name: "Maria" } });
    apiFetch.mockResolvedValue(meResponse({ needs_onboarding: false, profile: {} }));

    await expect(OnboardingPage()).rejects.toThrow("REDIRECT:/app");
  });

  it("usuário novo vê o formulário com o nome do provedor pré-preenchido", async () => {
    auth.mockResolvedValue({ user: { name: "Maria do Google" } });
    apiFetch.mockResolvedValue(meResponse({ needs_onboarding: true, profile: null }));

    render(await OnboardingPage());

    expect(screen.getByLabelText(/nome/i)).toHaveValue("Maria do Google");
    expect(screen.getByRole("button", { name: /concluir/i })).toBeInTheDocument();
  });
});
