import type { LegPublic, StopPublic } from "@traveltogether/types";

export interface JourneyPoint {
  id: string | null;
  label: string;
  code: string;
}

export interface JourneyLegSegment {
  kind: "leg";
  key: string;
  legId: string | null;
  from: JourneyPoint;
  to: JourneyPoint;
  fareCount: number;
}

export interface JourneyStopSegment {
  kind: "stop";
  key: string;
  stop: StopPublic;
}

export type JourneySegment = JourneyLegSegment | JourneyStopSegment;

export function displayCode(value: string): string {
  const match = value.match(/\(([A-Za-z]{3})\)/);
  if (match) return match[1].toUpperCase();
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const letters = normalized.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "TT").padEnd(3, "X");
}

function stopPoint(stop: StopPublic): JourneyPoint {
  return {
    id: stop.id,
    label: stop.city,
    code: stop.airport_code ?? displayCode(stop.city),
  };
}

function findLeg(
  legs: LegPublic[],
  originStopId: string | null,
  destinationStopId: string | null,
): LegPublic | null {
  return (
    legs.find(
      (leg) =>
        leg.origin_stop_id === originStopId && leg.destination_stop_id === destinationStopId,
    ) ?? null
  );
}

export function buildJourneySegments(
  origin: string,
  stops: StopPublic[],
  legs: LegPublic[],
  fareCounts: Record<string, number>,
): JourneySegment[] {
  if (stops.length === 0) return [];

  const home: JourneyPoint = { id: null, label: origin, code: displayCode(origin) };
  const segments: JourneySegment[] = [];
  let previousPoint = home;
  let previousStopId: string | null = null;

  for (const stop of stops) {
    const currentPoint = stopPoint(stop);
    const leg = findLeg(legs, previousStopId, stop.id);
    segments.push({
      kind: "leg",
      key: leg?.id ?? `leg-${previousStopId ?? "origin"}-${stop.id}`,
      legId: leg?.id ?? null,
      from: previousPoint,
      to: currentPoint,
      fareCount: leg ? (fareCounts[leg.id] ?? 0) : 0,
    });
    segments.push({ kind: "stop", key: stop.id, stop });
    previousPoint = currentPoint;
    previousStopId = stop.id;
  }

  const returnLeg = findLeg(legs, previousStopId, null);
  segments.push({
    kind: "leg",
    key: returnLeg?.id ?? `leg-${previousStopId ?? "origin"}-return`,
    legId: returnLeg?.id ?? null,
    from: previousPoint,
    to: home,
    fareCount: returnLeg ? (fareCounts[returnLeg.id] ?? 0) : 0,
  });

  return segments;
}
