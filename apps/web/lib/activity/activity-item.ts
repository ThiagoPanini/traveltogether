import type { ActivityItemPublic, ActivityKind } from "@traveltogether/types";

const KIND_LABEL: Record<ActivityKind, string> = {
  member_joined: "entrou",
  comment: "comentou",
  fare_registered: "pesquisa",
};

/** Rótulo curto do tipo de atividade, para o chip do feed. */
export function activityKindLabel(kind: ActivityKind): string {
  return KIND_LABEL[kind];
}

/**
 * Link do item para seu contexto. O feed derivado só carrega `trip_id`, então
 * o alvo navegável é sempre a Viagem onde o evento aconteceu.
 */
export function activityHref(item: ActivityItemPublic): string {
  return `/trips/${item.trip_id}`;
}
