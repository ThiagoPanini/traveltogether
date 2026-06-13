import { afterEach, describe, expect, it, vi } from "vitest";

import { searchAirports } from "./airports";

describe("searchAirports", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna [] sem token", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(searchAirports(undefined, "lisboa")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retorna [] com query em branco sem chamar a API", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(searchAirports("tok", "   ")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("busca por query no endpoint com bearer", async () => {
    const airports = [
      { iata: "LIS", city: "Lisboa", country: "Portugal", name: "x", latitude: 1, longitude: 2 },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(airports) }),
    );
    await expect(searchAirports("tok", "lisboa")).resolves.toEqual(airports);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/airports/search?q=lisboa&limit=8",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } }),
    );
  });

  it("retorna [] quando a API falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    await expect(searchAirports("tok", "lisboa")).resolves.toEqual([]);
  });
});
