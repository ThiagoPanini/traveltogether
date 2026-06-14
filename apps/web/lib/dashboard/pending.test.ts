import type { PendingActionPublic } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { pendingActionVerb, toPendingItem } from "./pending";

const legAction: PendingActionPublic = {
  kind: "leg_without_fare",
  trip_id: "trip-1",
  trip_name: "Eurotrip",
  target_kind: "leg",
  target_id: "leg-9",
  label: "GRU → LIS",
};

const stopAction: PendingActionPublic = {
  kind: "stop_without_itinerary",
  trip_id: "trip-1",
  trip_name: "Eurotrip",
  target_kind: "stop",
  target_id: "stop-7",
  label: "Lisboa",
};

describe("toPendingItem", () => {
  it("linka trajeto para a página do Trajeto", () => {
    const item = toPendingItem(legAction);
    expect(item.href).toBe("/trips/trip-1/legs/leg-9");
    expect(item.tripName).toBe("Eurotrip");
    expect(item.target).toBe("GRU → LIS");
  });

  it("linka parada para o Roteiro da Parada", () => {
    const item = toPendingItem(stopAction);
    expect(item.href).toBe("/trips/trip-1/stops/stop-7/itinerary");
  });

  it("usa verbo de ação por tipo", () => {
    expect(toPendingItem(legAction).verb).toBe(pendingActionVerb("leg_without_fare"));
    expect(pendingActionVerb("leg_without_fare")).toMatch(/pesquisa/i);
    expect(pendingActionVerb("fare_without_chosen")).toMatch(/escolhida/i);
    expect(pendingActionVerb("stop_without_itinerary")).toMatch(/roteiro/i);
  });
});
