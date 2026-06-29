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

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
  refresh.mockReset();
  update.mockReset();
});

describe("OnboardingForm (origem-base em etapa única)", () => {
  it("mostra nome pré-preenchido, origem e preview", () => {
    render(<OnboardingForm defaultName="Maria do Google" />);
    expect(screen.getByLabelText(/como te chamamos/i)).toHaveValue("Maria do Google");
    expect(screen.getByLabelText(/cidade de origem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/país/i)).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /seu cartão de origem/i })).toHaveTextContent(
      /sua cidade/i,
    );
  });

  it("habilita o envio quando nome, cidade e país estão preenchidos", () => {
    render(<OnboardingForm defaultName="Maria" />);
    const submit = screen.getByRole("button", { name: /concluir e embarcar/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/cidade de origem/i), {
      target: { value: "São Paulo" },
    });
    fireEvent.change(screen.getByLabelText(/país/i), { target: { value: "BR" } });

    expect(submit).toBeEnabled();
    expect(screen.getByRole("complementary", { name: /seu cartão de origem/i })).toHaveTextContent(
      /são paulo/i,
    );
  });

  it("envia perfil ao /api/profile, renova sessão e navega para /app", async () => {
    render(<OnboardingForm defaultName="Maria" />);
    fireEvent.change(screen.getByLabelText(/cidade de origem/i), {
      target: { value: "São Paulo" },
    });
    fireEvent.change(screen.getByLabelText(/país/i), { target: { value: "BR" } });

    fireEvent.click(screen.getByRole("button", { name: /concluir e embarcar/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/profile");
    expect(JSON.parse(init?.body as string)).toEqual({
      display_name: "Maria",
      origin_city: "São Paulo",
      country: "BR",
    });
    await waitFor(() => expect(update).toHaveBeenCalledWith({ needsOnboarding: false }));
    expect(refresh).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/app");
  });

  it("falha do servidor mantém na tela e mostra erro", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 422 }));
    render(<OnboardingForm defaultName="Ana" />);
    fireEvent.change(screen.getByLabelText(/cidade de origem/i), {
      target: { value: "Curitiba" },
    });
    fireEvent.change(screen.getByLabelText(/país/i), { target: { value: "BR" } });

    fireEvent.click(screen.getByRole("button", { name: /concluir e embarcar/i }));

    await screen.findByRole("alert");
    expect(push).not.toHaveBeenCalled();
  });
});
