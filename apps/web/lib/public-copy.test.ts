import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("public auth copy", () => {
  it("keeps private-access copy direct and removes the route interlude", async () => {
    const source = await readFile(new URL("../app/login/login-form.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("Check-in da galera");
    expect(source).not.toContain("VOCÊ");
    expect(source).not.toContain("∞");
    expect(source).toContain("Acesso privado");
  });
});
