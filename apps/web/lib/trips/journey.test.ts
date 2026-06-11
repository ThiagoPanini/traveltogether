import type { LegPublic, StopPublic } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { buildJourneySegments } from "./journey";

const STOPS: StopPublic[] = [
  {
    id: "stop-1",
    trip_id: "trip-1",
    city: "Lisboa",
    airport_code: "LIS",
    arrival_date: "2026-07-01",
    departure_date: "2026-07-04",
    cover_image_key: null,
    cover_image_url: null,
    order: 1,
  },
  {
    id: "stop-2",
    trip_id: "trip-1",
    city: "Barcelona",
    airport_code: "BCN",
    arrival_date: "2026-07-04",
    departure_date: "2026-07-08",
    cover_image_key: null,
    cover_image_url: null,
    order: 2,
  },
];

const LEGS: LegPublic[] = [
  {
    id: "leg-out",
    trip_id: "trip-1",
    origin_stop_id: null,
    destination_stop_id: "stop-1",
    target_date: null,
    order: 1,
  },
  {
    id: "leg-mid",
    trip_id: "trip-1",
    origin_stop_id: "stop-1",
    destination_stop_id: "stop-2",
    target_date: null,
    order: 2,
  },
  {
    id: "leg-back",
    trip_id: "trip-1",
    origin_stop_id: "stop-2",
    destination_stop_id: null,
    target_date: null,
    order: 3,
  },
];

describe("buildJourneySegments", () => {
  it("intercala trajetos derivados e paradas na ordem da viagem", () => {
    const segments = buildJourneySegments("São Paulo", STOPS, LEGS, {
      "leg-out": 0,
      "leg-mid": 2,
      "leg-back": 1,
    });

    expect(segments.map((segment) => segment.kind)).toEqual(["leg", "stop", "leg", "stop", "leg"]);
    expect(segments[0]).toMatchObject({
      kind: "leg",
      legId: "leg-out",
      from: { label: "São Paulo" },
      to: { label: "Lisboa", code: "LIS" },
      fareCount: 0,
    });
    expect(segments[2]).toMatchObject({
      kind: "leg",
      legId: "leg-mid",
      from: { label: "Lisboa", code: "LIS" },
      to: { label: "Barcelona", code: "BCN" },
      fareCount: 2,
    });
    expect(segments[4]).toMatchObject({
      kind: "leg",
      legId: "leg-back",
      from: { label: "Barcelona", code: "BCN" },
      to: { label: "São Paulo" },
      fareCount: 1,
    });
  });

  it("sem paradas → array vazio", () => {
    const segments = buildJourneySegments("São Paulo", [], [], {});
    expect(segments).toHaveLength(0);
  });

  it("1 parada → leg de ida, parada, leg de volta", () => {
    const stops = [STOPS[0]];
    const returnLeg: LegPublic = {
      id: "leg-return",
      trip_id: "trip-1",
      origin_stop_id: "stop-1",
      destination_stop_id: null,
      target_date: null,
      order: 2,
    };
    const legs = [LEGS[0], returnLeg];
    const segments = buildJourneySegments("São Paulo", stops, legs, {
      "leg-out": 3,
      "leg-return": 0,
    });
    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({ kind: "leg", legId: "leg-out", fareCount: 3 });
    expect(segments[1]).toMatchObject({ kind: "stop", stop: { city: "Lisboa" } });
    expect(segments[2]).toMatchObject({ kind: "leg", legId: "leg-return", fareCount: 0 });
  });
});
