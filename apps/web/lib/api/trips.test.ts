import { afterEach, describe, expect, it, vi } from "vitest";

import { createTrip, getTrip, getTrips, uploadStopCoverImage, uploadTripCoverImage } from "./trips";

const TRIP: import("@traveltogether/types").TripWithMembership = {
  trip: {
    id: "trip-1",
    name: "NYC Weekend",
    description: "",
    origin: "São Paulo",
    airport_code: "GRU",
    start_date: null,
    end_date: null,
    cover_image_key: null,
    cover_image_url: null,
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

const TRIP_SUMMARY: import("@traveltogether/types").TripSummary = {
  ...TRIP,
  stops: [
    {
      id: "stop-1",
      trip_id: "trip-1",
      city: "Lisboa",
      airport_code: "LIS",
      arrival_date: null,
      departure_date: null,
      cover_image_key: null,
      cover_image_url: null,
      order: 1,
    },
  ],
  cover_image_url: null,
};

describe("getTrips", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retorna lista de viagens com token válido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([TRIP_SUMMARY]) }),
    );

    await expect(getTrips("token")).resolves.toEqual([TRIP_SUMMARY]);
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

describe("uploadTripCoverImage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia multipart autenticado sem forçar content-type JSON", async () => {
    const data = new FormData();
    data.append("file", new Blob(["png"], { type: "image/png" }), "cover.png");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(TRIP.trip) }),
    );

    await expect(uploadTripCoverImage("token", "trip-1", data)).resolves.toEqual(TRIP.trip);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/trips/trip-1/cover-image",
      expect.objectContaining({
        method: "POST",
        body: data,
        headers: { Authorization: "Bearer token" },
      }),
    );
  });
});

describe("uploadStopCoverImage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia multipart autenticado da parada sem content-type JSON", async () => {
    const data = new FormData();
    data.append("file", new Blob(["webp"], { type: "image/webp" }), "cover.webp");
    const stop = { ...TRIP_SUMMARY.stops[0], cover_image_url: "https://cdn.example.com/stop.webp" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(stop) }),
    );

    await expect(uploadStopCoverImage("token", "trip-1", "stop-1", data)).resolves.toEqual(stop);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/trips/trip-1/stops/stop-1/cover-image",
      expect.objectContaining({
        method: "POST",
        body: data,
        headers: { Authorization: "Bearer token" },
      }),
    );
  });
});
