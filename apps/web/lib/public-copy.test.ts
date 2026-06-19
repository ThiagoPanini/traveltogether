import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("public auth copy", () => {
  it("keeps login copy direct and free of boarding-pass kitsch", async () => {
    const source = await readFile(new URL("../app/login/login-form.tsx", import.meta.url), "utf8");

    // direção Atlas: sem a metáfora antiga de cartão de embarque
    expect(source).not.toContain("Boarding pass");
    expect(source).not.toContain("Check-in da galera");
    expect(source).not.toContain("∞");

    // plataforma aberta: sem menção a beta fechado ou allowlist
    expect(source).not.toContain("beta fechado");
    expect(source).not.toContain("allowlist");

    // identidade do produto: o wordmark traveltogether lidera a tela
    expect(source).toContain("auth-wordmark");
    expect(source).toContain("together");
    // proposta de valor + chamada à jornada (sem o headline genérico antigo)
    expect(source).not.toContain("Entre ou crie sua conta");
    expect(source).toContain("O lugar para organizar sua viagem entre amigos");
    expect(source).toContain("Entre para iniciar sua jornada");
    expect(source).toContain("Google");
  });
});
