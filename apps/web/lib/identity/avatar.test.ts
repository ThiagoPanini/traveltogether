import { describe, expect, it } from "vitest";

import { topographicAvatar } from "./avatar";

describe("topographicAvatar", () => {
  it("retorna um data URI de SVG", () => {
    const uri = topographicAvatar("user-123");
    expect(uri.startsWith("data:image/svg+xml")).toBe(true);
  });

  it("é determinístico para o mesmo seed", () => {
    expect(topographicAvatar("abc")).toBe(topographicAvatar("abc"));
  });

  it("difere entre seeds distintos", () => {
    expect(topographicAvatar("abc")).not.toBe(topographicAvatar("xyz"));
  });

  it("seed vazio ainda produz um avatar válido", () => {
    expect(topographicAvatar("").startsWith("data:image/svg+xml")).toBe(true);
  });
});
