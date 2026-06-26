import type { Dispatch } from "react";
import type { TripDraft, TripDraftAction } from "@/lib/trips/draft";

/** Origem derivada do Perfil de quem cria (inv. 6) — não é uma Parada da Viagem. */
export type Origin = { city: string | null; country: string | null };

/** Props comuns a todos os passos do wizard. */
export type StepProps = {
  draft: TripDraft;
  dispatch: Dispatch<TripDraftAction>;
  origin: Origin;
};

/** Rótulo curto e legível da origem ("Sua cidade" quando o Perfil não tem cidade). */
export function originLabel(origin: Origin): string {
  return origin.city?.trim() || "Sua cidade";
}
