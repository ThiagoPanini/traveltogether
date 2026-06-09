import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiHealth } from "./health";

describe("getApiHealth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna o status parseado quando a API responde", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "ok", db: "ok" }),
      }),
    );
    const result = await getApiHealth();
    expect(result).toEqual({ status: "ok", db: "ok" });
  });

  it("retorna status de erro quando a API está inacessível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const result = await getApiHealth();
    expect(result).toEqual({ status: "error", db: "error" });
  });
});
