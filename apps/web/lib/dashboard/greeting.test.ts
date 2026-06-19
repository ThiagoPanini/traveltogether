import { describe, expect, it } from "vitest";

import { buildGreeting, salutationFor } from "./greeting";

describe("salutationFor", () => {
  it("manhã até o meio-dia", () => {
    expect(salutationFor(0)).toBe("Bom dia");
    expect(salutationFor(11)).toBe("Bom dia");
  });

  it("tarde entre meio-dia e 18h", () => {
    expect(salutationFor(12)).toBe("Boa tarde");
    expect(salutationFor(17)).toBe("Boa tarde");
  });

  it("noite a partir das 18h", () => {
    expect(salutationFor(18)).toBe("Boa noite");
    expect(salutationFor(23)).toBe("Boa noite");
  });
});

describe("buildGreeting", () => {
  it("cumprimenta pelo primeiro nome, conforme a hora", () => {
    const now = new Date(2026, 5, 18, 9, 0);
    expect(buildGreeting("Marina Souza", now).salutation).toBe("Bom dia, Marina");
    expect(buildGreeting("Marina Souza", new Date(2026, 5, 18, 20, 0)).salutation).toBe(
      "Boa noite, Marina",
    );
  });

  it("monta a linha de data dia-da-semana · dia mês", () => {
    const now = new Date(2026, 5, 18, 9, 0);
    expect(buildGreeting("Marina", now).dateLine).toBe("quinta · 18 jun");
  });
});
