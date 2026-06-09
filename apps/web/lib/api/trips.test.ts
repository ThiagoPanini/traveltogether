import { afterEach, describe, expect, it, vi } from "vitest";

import { createTrip, getTrip, getTrips } from "./trips";

const TRIP: import("@traveltogether/types").TripWithMembership = {
  trip: {
    id: "trip-1",
    name: "NYC Weekend",
    description: "",
    origin: "São Paulo",
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
  },
  membership: {
    id: "mem-1",
    trip_id: "trip-1",
    user_id: "user-1",
    role: "organizer",
    joined_at: "2026-01-01T00:00:00Z",
  },
};

describe("getTrips", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retorna lista de viagens com token válido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([TRIP]) }),
    );

    await expect(getTrips("token")).resolves.toEqual([TRIP]);
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/trips", expect.any(Object));
  });

  it("retorna lista vazia quando API não responde", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(getTrips("token")).resolves.toEqual([]);
  });
});

describe("getTrip", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retorna viagem pelo id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(TRIP) }),
    );

    await expect(getTrip("token", "trip-1")).resolves.toEqual(TRIP);
  });

  it("retorna null para 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(getTrip("token", "trip-1")).resolves.toBeNull();
  });
});

describe("createTrip", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia POST e retorna viagem criada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(TRIP) }),
    );

    const payload = { name: "NYC Weekend", description: "", origin: "São Paulo" };
    await expect(createTrip("token", payload)).resolves.toEqual(TRIP);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/trips",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
