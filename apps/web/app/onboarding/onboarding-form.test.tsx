import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push, refresh, update } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ update }) }));

import { OnboardingForm } from "./onboarding-form";

function preencher({ nome = "Maria", cidade = "São Paulo", pais = "BR" } = {}) {
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: nome } });
  fireEvent.change(screen.getByLabelText(/cidade de origem/i), { target: { value: cidade } });
  fireEvent.change(screen.getByLabelText(/país/i), { target: { value: pais } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
  refresh.mockReset();
  update.mockReset();
});

describe("OnboardingForm (perfil mínimo)", () => {
  it("renderiza nome (prefill), cidade de origem e país", () => {
    render(<OnboardingForm defaultName="Maria do Google" />);
    expect(screen.getByLabelText(/nome/i)).toHaveValue("Maria do Google");
    expect(screen.getByLabelText(/cidade de origem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/país/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /concluir/i })).toBeInTheDocument();
  });

  it("envia o perfil ao /api/profile e cai no /app autenticado", async () => {
    render(<OnboardingForm defaultName="Maria" />);
    preencher({ nome: "Maria", cidade: "São Paulo", pais: "BR" });
    fireEvent.click(screen.getByRole("button", { name: /concluir/i }));

    // chamou o proxy do BFF com o perfil mínimo
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/profile");
    expect(JSON.parse(init?.body as string)).toEqual({
      display_name: "Maria",
      origin_city: "São Paulo",
      country: "BR",
    });

    // navegou para a área logada
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
  });

  it("renova a sessão (needsOnboarding=false) antes de seguir, pra rota protegida não voltar pro onboarding", async () => {
    render(<OnboardingForm defaultName="Maria" />);
    preencher();
    fireEvent.click(screen.getByRole("button", { name: /concluir/i }));

    // o JWT carimbado no login fica obsoleto após onboardar; renovar evita o
    // ping-pong /app → /onboarding no middleware (#193).
    await waitFor(() => expect(update).toHaveBeenCalledWith({ needsOnboarding: false }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
  });

  it("Concluir só habilita com nome, cidade e país preenchidos", () => {
    render(<OnboardingForm />);
    const concluir = screen.getByRole("button", { name: /concluir/i });
    // nada preenchido → desabilitado
    expect(concluir).toBeDisabled();
    // só nome e cidade → ainda desabilitado (país falta)
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText(/cidade de origem/i), {
      target: { value: "São Paulo" },
    });
    expect(concluir).toBeDisabled();
    // país escolhido → habilita
    fireEvent.change(screen.getByLabelText(/país/i), { target: { value: "BR" } });
    expect(concluir).toBeEnabled();
  });

  it("falha do servidor mantém na tela e mostra erro", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 422 }));
    render(<OnboardingForm defaultName="Maria" />);
    preencher();
    fireEvent.click(screen.getByRole("button", { name: /concluir/i }));

    await screen.findByRole("alert");
    expect(push).not.toHaveBeenCalled();
  });
});
