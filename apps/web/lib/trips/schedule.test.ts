import type { ItineraryItemPublic, LegPublic, StopPublic } from "@traveltogether/types";
import { describe, expect, it } from "vitest";
import { buildSchedule } from "./schedule";

function makeStop(
  id: string,
  order: number,
  arrival: string | null,
  departure: string | null,
): StopPublic {
  return {
    id,
    trip_id: "trip-1",
    city: `City ${id}`,
    airport_code: null,
    latitude: null,
    longitude: null,
    arrival_date: arrival,
    departure_date: departure,
    cover_image_key: null,
    cover_image_url: null,
    order,
  };
}

function makeLeg(
  id: string,
  order: number,
  originId: string | null,
  destId: string | null,
): LegPublic {
  return {
    id,
    trip_id: "trip-1",
    origin_stop_id: originId,
    destination_stop_id: destId,
    target_date: null,
    order,
  };
}

function makeItem(
  id: string,
  stopId: string,
  day: string | null,
  time: string | null,
): ItineraryItemPublic {
  return {
    id,
    stop_id: stopId,
    title: `Item ${id}`,
    notes: "",
    link: "",
    day,
    time,
    order: 0,
  };
}

describe("buildSchedule", () => {
  it("retorna lista vazia sem paradas", () => {
    expect(buildSchedule("Origem", [], [], {})).toEqual([]);
  });

  it("cronograma básico: leg → estadia → leg de volta", () => {
    const stopA = makeStop("a", 0, "2026-09-02", "2026-09-05");
    const legOut = makeLeg("leg-1", 0, null, "a");
    const legBack = makeLeg("leg-2", 1, "a", null);

    const blocks = buildSchedule("Origem", [stopA], [legOut, legBack], {});

    expect(blocks).toHaveLength(3);
    expect(blocks[0].kind).toBe("leg");
    expect(blocks[1].kind).toBe("stay");
    expect(blocks[2].kind).toBe("leg");
  });

  it("estadia contém items com dia ordenados por dia+hora", () => {
    const stop = makeStop("a", 0, "2026-09-02", "2026-09-05");
    const items = {
      a: [
        makeItem("i2", "a", "2026-09-04", "10:00"),
        makeItem("i1", "a", "2026-09-03", "09:00"),
        makeItem("i3", "a", "2026-09-03", "14:00"),
      ],
    };

    const blocks = buildSchedule("Origem", [stop], [], items);
    const stay = blocks.find((b) => b.kind === "stay");
    expect(stay).toBeDefined();
    if (stay?.kind !== "stay") return;

    expect(stay.scheduledItems.map((i) => i.id)).toEqual(["i1", "i3", "i2"]);
  });

  it("items sem dia ficam em unscheduledItems", () => {
    const stop = makeStop("a", 0, "2026-09-02", "2026-09-05");
    const items = {
      a: [makeItem("i1", "a", "2026-09-03", null), makeItem("i2", "a", null, null)],
    };

    const blocks = buildSchedule("Origem", [stop], [], items);
    const stay = blocks.find((b) => b.kind === "stay");
    if (stay?.kind !== "stay") throw new Error("expected stay");

    expect(stay.scheduledItems).toHaveLength(1);
    expect(stay.unscheduledItems).toHaveLength(1);
    expect(stay.unscheduledItems[0].id).toBe("i2");
  });

  it("ordena paradas pelo campo order", () => {
    const stopB = makeStop("b", 1, "2026-09-06", "2026-09-08");
    const stopA = makeStop("a", 0, "2026-09-02", "2026-09-05");

    const blocks = buildSchedule("Origem", [stopB, stopA], [], {});
    const stays = blocks.filter((b) => b.kind === "stay");
    if (stays[0]?.kind !== "stay" || stays[1]?.kind !== "stay") throw new Error("expected stays");

    expect(stays[0].stop.id).toBe("a");
    expect(stays[1].stop.id).toBe("b");
  });

  it("marca cada leg com o estado de Escolhida (a decidir quando não há)", () => {
    const stopA = makeStop("a", 0, "2026-09-02", "2026-09-05");
    const legOut = makeLeg("leg-1", 0, null, "a");
    const legBack = makeLeg("leg-2", 1, "a", null);

    const blocks = buildSchedule("Origem", [stopA], [legOut, legBack], {}, { "leg-1": true });
    const legBlocks = blocks.filter((b) => b.kind === "leg");
    if (legBlocks[0]?.kind !== "leg" || legBlocks[1]?.kind !== "leg") {
      throw new Error("expected legs");
    }

    expect(legBlocks[0].legId).toBe("leg-1");
    expect(legBlocks[0].chosen).toBe(true);
    expect(legBlocks[1].legId).toBe("leg-2");
    expect(legBlocks[1].chosen).toBe(false);
  });

  it("legs sem parada vinculada ficam como leg genérico", () => {
    const stop = makeStop("a", 0, null, null);
    const leg = makeLeg("leg-1", 0, null, "a");
    const blocks = buildSchedule("Origem", [stop], [leg], {});
    const legBlock = blocks.find((b) => b.kind === "leg");
    if (legBlock?.kind !== "leg") throw new Error("expected leg");
    expect(legBlock.fromCity).toBe("Origem");
    expect(legBlock.toCity).toBe("City a");
  });
});
