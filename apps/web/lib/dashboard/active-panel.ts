import type { LegPublic, SegmentMode, TripSummary } from "@traveltogether/types";

import { dateOnly, formatDateRange } from "../format/date";
import { buildJourneySegments } from "../trips/journey";

// Painel Espresso (rodada 0): dashboard da Viagem ativa/próxima. Lógica pura,
// determinística — a page server só busca os dados e chama `buildActivePanel`.
// O radar é ESQUELETO: uma linha por Trajeto com modo e "cotação em breve",
// sem preço/sparkline/delta (esses dependem de Pesquisa registrada, fora da
// rodada 0 — Round 3). Ver ADR-0020, DESIGN.md, decisão #8 do PRD #159.

/** Modo do Trajeto na rodada 0 (Rota direta de 1 Trecho). */
export type PanelLegMode = SegmentMode; // "air" | "ground"

export interface PanelMember {
  seed: string;
  label: string;
  avatarUrl: string | null;
}

export interface RibbonCity {
  kind: "city";
  key: string;
  label: string;
}
export interface RibbonHop {
  kind: "hop";
  key: string;
  mode: PanelLegMode;
}
export type RibbonItem = RibbonCity | RibbonHop;

/** Linha do radar — estrutura-only. Sem campo de preço, por desenho. */
export interface RadarRow {
  key: string;
  fromTo: string;
  mode: PanelLegMode;
  status: "pending";
}

export interface PanelHero {
  tripId: string;
  name: string;
  periodLabel: string;
  members: PanelMember[];
  ribbon: RibbonItem[];
  radar: RadarRow[];
}

/** Card inerte da cauda "outras viagens" — não navega (miolo inacessível). */
export interface OtherTripCard {
  id: string;
  name: string;
  tag: string;
}

/** A Viagem em foco já com o que a page buscou: Trajetos, membros e modos. */
export interface ActiveTripBundle {
  trip: TripSummary;
  legs: LegPublic[];
  members: PanelMember[];
  legMode: Record<string, PanelLegMode>;
}

export interface ActivePanel {
  hero: PanelHero | null;
  others: OtherTripCard[];
  isEmpty: boolean;
}

export interface ActivePanelInput {
  trips: TripSummary[];
  active: ActiveTripBundle | null;
  todayIso: string;
}

/** Janela [start, end] cobre hoje (end ausente = só exige start <= hoje). */
function isOngoing(trip: TripSummary, today: string): boolean {
  const start = dateOnly(trip.trip.start_date);
  if (!start || start > today) return false;
  const end = dateOnly(trip.trip.end_date);
  return !end || end >= today;
}

/**
 * Viagem em foco: a em curso (hoje no período); senão a próxima futura mais
 * próxima; senão a passada mais recente. Null sem nenhuma Viagem com data.
 */
export function selectActiveTrip(trips: TripSummary[], todayIso: string): TripSummary | null {
  const today = dateOnly(todayIso);
  if (!today) return trips[0] ?? null;

  const ongoing = trips.find((t) => isOngoing(t, today));
  if (ongoing) return ongoing;

  let upcoming: TripSummary | null = null;
  let upcomingStart: string | null = null;
  let past: TripSummary | null = null;
  let pastStart: string | null = null;
  for (const t of trips) {
    const start = dateOnly(t.trip.start_date);
    if (!start) continue;
    if (start >= today) {
      if (upcomingStart === null || start < upcomingStart) {
        upcoming = t;
        upcomingStart = start;
      }
    } else if (pastStart === null || start > pastStart) {
      past = t;
      pastStart = start;
    }
  }
  return upcoming ?? past;
}

function tagFor(trip: TripSummary): string {
  const range = formatDateRange(trip.trip.start_date, trip.trip.end_date);
  return range || "sem data";
}

function buildHero(active: ActiveTripBundle): PanelHero {
  const { trip, legs, members, legMode } = active;
  const segments = buildJourneySegments(trip.trip.origin, trip.stops, legs, {});

  const ribbon: RibbonItem[] = [];
  const radar: RadarRow[] = [];
  let first = true;
  for (const seg of segments) {
    if (seg.kind !== "leg") continue;
    if (first) {
      ribbon.push({ kind: "city", key: `city-${seg.from.id ?? "origin"}`, label: seg.from.label });
      first = false;
    }
    const mode: PanelLegMode = (seg.legId && legMode[seg.legId]) || "air";
    ribbon.push({ kind: "hop", key: `hop-${seg.key}`, mode });
    ribbon.push({
      kind: "city",
      key: `city-${seg.to.id ?? "home"}-${seg.key}`,
      label: seg.to.label,
    });
    radar.push({
      key: seg.key,
      fromTo: `${seg.from.label} → ${seg.to.label}`,
      mode,
      status: "pending",
    });
  }

  return {
    tripId: trip.trip.id,
    name: trip.trip.name,
    periodLabel: formatDateRange(trip.trip.start_date, trip.trip.end_date),
    members,
    ribbon,
    radar,
  };
}

export function buildActivePanel({
  trips,
  active,
  todayIso: _todayIso,
}: ActivePanelInput): ActivePanel {
  if (trips.length === 0 || !active) {
    return { hero: null, others: [], isEmpty: true };
  }
  const others = trips
    .filter((t) => t.trip.id !== active.trip.trip.id)
    .map((t) => ({ id: t.trip.id, name: t.trip.name, tag: tagFor(t) }));
  return { hero: buildHero(active), others, isEmpty: false };
}
