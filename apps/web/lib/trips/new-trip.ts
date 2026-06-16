export interface NewTripStopDates {
  arrive: string;
  depart: string;
}

/**
 * Valida as datas de uma nova Viagem contra os invariantes 4/5/6 do CONTEXT:
 * - 4: ida e volta presentes, com volta >= ida;
 * - 5: havendo Paradas, a primeira começa na ida e a última termina na volta;
 * - 6: cada Parada fica dentro do Período e sua saída não antecede a chegada;
 *   as Paradas seguem em ordem cronológica (saída <= chegada da seguinte).
 *
 * Datas são ISO `YYYY-MM-DD` — a comparação lexicográfica equivale à cronológica.
 */
export function newTripDatesValid(start: string, end: string, stops: NewTripStopDates[]): boolean {
  if (!start || !end || end < start) return false;
  if (stops.length === 0) return true;

  for (const stop of stops) {
    if (!stop.arrive || !stop.depart) return false;
    // Invariante 6: dentro do período e saída não anterior à chegada.
    if (stop.arrive < start || stop.depart > end || stop.depart < stop.arrive) return false;
  }

  // Invariante 6 (sequência): cada Parada parte antes da chegada da seguinte.
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].arrive < stops[i - 1].depart) return false;
  }

  // Invariante 5: primeira começa na ida, última termina na volta.
  if (stops[0].arrive !== start) return false;
  if (stops[stops.length - 1].depart !== end) return false;

  return true;
}
