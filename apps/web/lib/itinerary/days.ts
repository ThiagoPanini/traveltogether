import type { ItineraryItemPublic } from "@traveltogether/types";

import { dateOnly } from "../format/date";

export interface ItineraryDay {
  /** Número do dia (1-based) dentro da estadia. */
  n: number;
  /** Data do dia em `YYYY-MM-DD`. */
  date: string;
  /** Itens do dia ordenados por horário (sem horário vão por último). */
  items: ItineraryItemPublic[];
}

export interface ItineraryDays {
  days: ItineraryDay[];
  /** Itens sem dia, ou ancorados num dia fora da janela da Parada. */
  unscheduled: ItineraryItemPublic[];
  /** `false` quando faltam datas de chegada/partida — Roteiro vira lista plana. */
  hasWindow: boolean;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function byTime(a: ItineraryItemPublic, b: ItineraryItemPublic): number {
  return (a.time || "99:99").localeCompare(b.time || "99:99");
}

/**
 * Agrupa os Itens de Roteiro por dia derivado das datas da Parada.
 * Dias numerados de chegada→partida (inclusivo); itens sem dia ou fora da
 * janela viram "sem dia definido". Sem datas, `days` é vazio e tudo é unscheduled.
 */
export function buildItineraryDays(
  arrivalDate: string | null | undefined,
  departureDate: string | null | undefined,
  items: ItineraryItemPublic[],
): ItineraryDays {
  const arrival = dateOnly(arrivalDate);
  const departure = dateOnly(departureDate);
  const hasWindow = Boolean(arrival && departure);

  if (!hasWindow || !arrival || !departure) {
    return { days: [], unscheduled: [...items], hasWindow: false };
  }

  const span = Math.round(
    (new Date(`${departure}T00:00:00`).getTime() - new Date(`${arrival}T00:00:00`).getTime()) /
      86_400_000,
  );
  const dayCount = Math.max(0, span) + 1;

  const days: ItineraryDay[] = Array.from({ length: dayCount }, (_, i) => {
    const date = addDays(arrival, i);
    return {
      n: i + 1,
      date,
      items: items.filter((it) => dateOnly(it.day) === date).sort(byTime),
    };
  });

  const dayDates = new Set(days.map((d) => d.date));
  const unscheduled = items.filter((it) => {
    const day = dateOnly(it.day);
    return !day || !dayDates.has(day);
  });

  return { days, unscheduled, hasWindow: true };
}
