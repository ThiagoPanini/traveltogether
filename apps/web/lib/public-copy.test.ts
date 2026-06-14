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

    // identidade do produto presente
    expect(source).toContain("Identifique-se");
    expect(source).toContain("Google");
  });
});
