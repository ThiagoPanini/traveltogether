import type { PlacePublic } from "@traveltogether/types";

export interface ItemFields {
  title: string;
  notes: string;
  link: string;
}

// Mapeia um lugar selecionado para os campos do Item de Roteiro: título do nome,
// endereço para notas e link. Campos vazios no lugar não sobrescrevem (#61).
export function placeToItemFields(place: PlacePublic, current?: Partial<ItemFields>): ItemFields {
  return {
    title: place.name,
    notes: place.address || current?.notes || "",
    link: place.link || current?.link || "",
  };
}
