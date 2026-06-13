import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser, updateProfile } from "./current-user";

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

describe("updateProfile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia PATCH com o token bearer e devolve o usuário atualizado", async () => {
    const updated = {
      id: "user-id",
      email: "alice@example.com",
      display_name: "Alice Atlas",
      avatar_url: "https://cdn/a.png",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(updated) }),
    );

    await expect(
      updateProfile("jwt-token", { display_name: "Alice Atlas", avatar_url: "https://cdn/a.png" }),
    ).resolves.toEqual(updated);

    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/identity/me", {
      method: "PATCH",
      cache: "no-store",
      headers: {
        Authorization: "Bearer jwt-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ display_name: "Alice Atlas", avatar_url: "https://cdn/a.png" }),
    });
  });

  it("retorna null quando a resposta não é ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(updateProfile("jwt-token", { display_name: "X" })).resolves.toBeNull();
  });

  it("retorna null sem token", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(updateProfile(undefined, { display_name: "X" })).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
