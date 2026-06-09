import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser } from "./current-user";

describe("getCurrentUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna null sem token de sessão", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getCurrentUser(undefined)).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("busca CurrentUser no API com token bearer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "user-id", email: "alice@example.com" }),
      }),
    );

    await expect(getCurrentUser("jwt-token")).resolves.toEqual({
      id: "user-id",
      email: "alice@example.com",
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/identity/me", {
      cache: "no-store",
      headers: {
        Authorization: "Bearer jwt-token",
      },
    });
  });

  it("retorna null quando o API protegido está inacessível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    await expect(getCurrentUser("jwt-token")).resolves.toBeNull();
  });
});
