import type { PendingActionKind, PendingActionPublic } from "@traveltogether/types";

// Verbo de ação que descreve o que falta fazer em cada pendência derivada (#58).
const VERBS: Record<PendingActionKind, string> = {
  leg_without_fare: "Registrar Pesquisa de Passagem",
  fare_without_chosen: "Marcar a Escolhida",
  stop_without_itinerary: "Montar o Roteiro",
};

export function pendingActionVerb(kind: PendingActionKind): string {
  return VERBS[kind];
}

export interface PendingItem {
  kind: PendingActionKind;
  verb: string;
  target: string;
  tripId: string;
  tripName: string;
  href: string;
}

// Resolve cada pendência no link que a resolve, sem N+1 no servidor.
export function toPendingItem(action: PendingActionPublic): PendingItem {
  const href =
    action.target_kind === "stop"
      ? `/trips/${action.trip_id}/stops/${action.target_id}/itinerary`
      : `/trips/${action.trip_id}/legs/${action.target_id}`;
  return {
    kind: action.kind,
    verb: pendingActionVerb(action.kind),
    target: action.label,
    tripId: action.trip_id,
    tripName: action.trip_name,
    href,
  };
}
