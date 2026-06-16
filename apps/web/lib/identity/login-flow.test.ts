import { describe, expect, it } from "vitest";

import { CODE_TTL_SECONDS, canResend, formatTtl, isValidEmail, loginStep } from "./login-flow";

describe("loginStep", () => {
  it("vai de 'choose' para 'email' ao escolher e-mail", () => {
    expect(loginStep("choose", { type: "chooseEmail" })).toBe("email");
  });

  it("vai de 'email' para 'code' quando o código é enviado", () => {
    expect(loginStep("email", { type: "codeSent" })).toBe("code");
  });

  it("volta de 'code' para 'email' ao trocar e-mail", () => {
    expect(loginStep("code", { type: "changeEmail" })).toBe("email");
  });

  it("volta de 'email' para 'choose' ao pedir outras formas de entrar", () => {
    expect(loginStep("email", { type: "backToChoose" })).toBe("choose");
  });
});

describe("formatTtl", () => {
  it("formata o TTL como mm:ss com zero à esquerda", () => {
    expect(formatTtl(300)).toBe("05:00");
    expect(formatTtl(9)).toBe("00:09");
  });

  it("nunca mostra negativo: zero ou menos vira 00:00", () => {
    expect(formatTtl(0)).toBe("00:00");
    expect(formatTtl(-5)).toBe("00:00");
  });
});

describe("canResend", () => {
  it("bloqueia reenvio nos primeiros 20s após enviar", () => {
    expect(canResend(CODE_TTL_SECONDS, false)).toBe(false);
    expect(canResend(CODE_TTL_SECONDS - 5, false)).toBe(false);
  });

  it("libera reenvio depois de 20s de janela", () => {
    expect(canResend(CODE_TTL_SECONDS - 20, false)).toBe(true);
  });

  it("libera reenvio sempre que o código expirou", () => {
    expect(canResend(0, true)).toBe(true);
  });
});

describe("isValidEmail", () => {
  it("aceita e-mail bem formado (ignora espaços nas bordas)", () => {
    expect(isValidEmail("voce@exemplo.com")).toBe(true);
    expect(isValidEmail("  voce@exemplo.com  ")).toBe(true);
  });

  it("rejeita sem @, sem domínio ou vazio", () => {
    expect(isValidEmail("voce")).toBe(false);
    expect(isValidEmail("voce@exemplo")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});
