import type { ItineraryItemPublic, LegPublic, StopPublic } from "@traveltogether/types";

export interface LegBlock {
  kind: "leg";
  legId: string | null;
  fromCity: string;
  toCity: string;
  date: string | null;
  /** Trajeto tem Pesquisa de Passagem Escolhida; `false` = "a decidir". */
  chosen: boolean;
}

export interface StayBlock {
  kind: "stay";
  stop: StopPublic;
  scheduledItems: ItineraryItemPublic[];
  unscheduledItems: ItineraryItemPublic[];
}

export type ScheduleBlock = LegBlock | StayBlock;

function itemSortKey(item: ItineraryItemPublic): string {
  const day = item.day ?? "9999-99-99";
  const time = item.time ?? "99:99";
  return `${day}T${time}`;
}

export function buildSchedule(
  originCity: string,
  stops: StopPublic[],
  legs: LegPublic[],
  itemsByStop: Record<string, ItineraryItemPublic[]>,
  chosenByLeg: Record<string, boolean> = {},
): ScheduleBlock[] {
  if (stops.length === 0) return [];

  const sorted = [...stops].sort((a, b) => a.order - b.order);
  const stopById: Record<string, StopPublic> = {};
  for (const s of sorted) stopById[s.id] = s;

  const legsByDestination: Record<string, LegPublic> = {};
  const legsByOrigin: Record<string, LegPublic> = {};
  for (const leg of legs) {
    if (leg.destination_stop_id) legsByDestination[leg.destination_stop_id] = leg;
    if (leg.origin_stop_id) legsByOrigin[leg.origin_stop_id] = leg;
  }

  const blocks: ScheduleBlock[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const stop = sorted[i];

    // leg into this stop
    const legIn = legsByDestination[stop.id] ?? legs.find((l) => l.order === i) ?? null;
    const prevStop = i === 0 ? null : sorted[i - 1];
    const fromCity = prevStop ? prevStop.city : originCity;
    blocks.push({
      kind: "leg",
      legId: legIn?.id ?? null,
      fromCity,
      toCity: stop.city,
      date: legIn?.target_date ?? stop.arrival_date ?? null,
      chosen: legIn ? (chosenByLeg[legIn.id] ?? false) : false,
    });

    // stay
    const allItems = itemsByStop[stop.id] ?? [];
    const scheduledItems = allItems
      .filter((item) => item.day !== null)
      .sort((a, b) => itemSortKey(a).localeCompare(itemSortKey(b)));
    const unscheduledItems = allItems.filter((item) => item.day === null);

    blocks.push({ kind: "stay", stop, scheduledItems, unscheduledItems });
  }

  // leg back to origin
  const lastStop = sorted[sorted.length - 1];
  const legBack = legsByOrigin[lastStop.id] ?? null;
  blocks.push({
    kind: "leg",
    legId: legBack?.id ?? null,
    fromCity: lastStop.city,
    toCity: originCity,
    date: legBack?.target_date ?? lastStop.departure_date ?? null,
    chosen: legBack ? (chosenByLeg[legBack.id] ?? false) : false,
  });

  return blocks;
}
