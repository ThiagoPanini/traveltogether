import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push, signIn } = vi.hoisted(() => ({ push: vi.fn(), signIn: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next-auth/react", () => ({ signIn }));

import { SignInForm } from "./sign-in-form";

function digitar(code: string) {
  const cells = screen.getAllByRole("textbox");
  code.split("").forEach((digit, i) => {
    fireEvent.change(cells[i], { target: { value: digit } });
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
  signIn.mockReset();
});

describe("SignInForm (login OTP, duas etapas)", () => {
  it("passo 1: e-mail, Continuar, divisor 'ou' e a opção do Google", () => {
    render(<SignInForm googleEnabled />);
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar$/i })).toBeInTheDocument();
    expect(screen.getByText(/^ou$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar com google/i })).toBeEnabled();
  });

  it("Google habilitado: o botão dispara o provedor google rumo ao /app", () => {
    render(<SignInForm googleEnabled />);
    fireEvent.click(screen.getByRole("button", { name: /continuar com google/i }));
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/app" });
  });

  it("Google indisponível: botão desabilitado e nunca dispara o provedor", () => {
    render(<SignInForm />);
    const botao = screen.getByRole("button", { name: /google.*indispon|indispon.*google/i });
    expect(botao).toBeDisabled();
    fireEvent.click(botao);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("ponta-a-ponta: e-mail → código → cai no /app autenticado", async () => {
    signIn.mockResolvedValue({ ok: true, error: null });
    render(<SignInForm />);

    // passo 1: pede o código
    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "viajante@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continuar$/i }));

    // chamou o proxy de pedido de OTP
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/otp/request");
    expect(JSON.parse(init?.body as string)).toEqual({ email: "viajante@example.com" });

    // passo 2: tela do código de embarque
    await screen.findByRole("group", { name: /código de embarque/i });
    expect(screen.getByText(/expira em/i)).toBeInTheDocument();

    // digita e embarca
    digitar("246813");
    fireEvent.click(screen.getByRole("button", { name: /embarcar/i }));

    // chamou o provedor OTP do Auth.js e navegou para a área logada
    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith("otp", {
        email: "viajante@example.com",
        code: "246813",
        redirect: false,
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
  });

  it("'trocar e-mail' volta ao passo 1", async () => {
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "viajante@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continuar$/i }));
    await screen.findByRole("group", { name: /código de embarque/i });

    fireEvent.click(screen.getByRole("button", { name: /trocar e-mail/i }));

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /código de embarque/i })).not.toBeInTheDocument();
  });

  it("código recusado não navega e mostra erro", async () => {
    signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "viajante@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continuar$/i }));
    await screen.findByRole("group", { name: /código de embarque/i });

    digitar("000000");
    fireEvent.click(screen.getByRole("button", { name: /embarcar/i }));

    await screen.findByText(/código inválido ou expirado/i);
    expect(push).not.toHaveBeenCalled();
  });
});
