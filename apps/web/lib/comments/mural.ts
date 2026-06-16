import type { CommentTargetType } from "@traveltogether/types";

/** Rótulo da pílula de âncora; `null` para o Comentário de alvo Viagem (mural). */
export function anchorLabel(targetType: CommentTargetType): string | null {
  switch (targetType) {
    case "fare_quote":
      return "Pesquisa de Passagem";
    case "itinerary_item":
      return "Item de Roteiro";
    default:
      return null;
  }
}

/** Comentário ancorado a Pesquisa/Item é read-only no mural (post é no contexto do alvo). */
export function isAnchored(targetType: CommentTargetType): boolean {
  return targetType !== "trip";
}
