import type { TripSummary } from "@traveltogether/types";

import { dateOnly } from "../format/date";

// Próxima Viagem em destaque (#67): a de data de ida futura mais próxima.
// Viagens sem data de ida ficam de fora; empate mantém a ordem de entrada.
export function selectNextTrip(summaries: TripSummary[], todayIso: string): TripSummary | null {
  const today = dateOnly(todayIso);
  let best: TripSummary | null = null;
  let bestStart: string | null = null;
  for (const summary of summaries) {
    const start = dateOnly(summary.trip.start_date);
    if (!start || !today || start < today) continue;
    if (bestStart === null || start < bestStart) {
      best = summary;
      bestStart = start;
    }
  }
  return best;
}

// Dias inteiros entre hoje e a data de ida (nunca negativo).
export function countdownDays(startIso: string, todayIso: string): number {
  const start = dateOnly(startIso);
  const today = dateOnly(todayIso);
  if (!start || !today) return 0;
  const diff = new Date(`${start}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}
