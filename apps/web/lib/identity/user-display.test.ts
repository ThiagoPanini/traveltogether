import { describe, expect, it } from "vitest";

import { displayLabel, initials } from "./user-display";

describe("displayLabel", () => {
  it("usa display_name quando presente", () => {
    expect(displayLabel({ display_name: "Alice Atlas", email: "a@x.com" })).toBe("Alice Atlas");
  });

  it("cai para a parte local do e-mail sem nome", () => {
    expect(displayLabel({ display_name: null, email: "alice@example.com" })).toBe("alice");
  });

  it("ignora display_name em branco", () => {
    expect(displayLabel({ display_name: "   ", email: "bob@example.com" })).toBe("bob");
  });
});

describe("initials", () => {
  it("duas iniciais de nome composto", () => {
    expect(initials("Alice Atlas")).toBe("AA");
  });

  it("uma inicial de nome simples", () => {
    expect(initials("alice")).toBe("A");
  });

  it("vazio quando não há texto", () => {
    expect(initials("   ")).toBe("");
  });
});
