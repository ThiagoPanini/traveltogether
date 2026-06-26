/**
 * Metadados dos tipos de translado (ADR-0009) para a UI da criação: rótulo pt-BR e
 * se é **cotável** depois (vira Pesquisa de preço). O ícone é mono/linha (lucide,
 * herda a cor — sem emoji), mapeado à parte em `app/.../nova/transfer-icons.tsx`.
 * `undecided` e `other` são tratados à parte na grade.
 */

import type { TransferDraft, TransferKind } from "./draft";

export type TransferMeta = {
  kind: TransferKind;
  label: string;
  /** Tem o que cotar? (avião/carro alugado/ônibus/trem/van sim; a pé e carro próprio não.) */
  quotable: boolean;
};

/** Tipos concretos oferecidos na grade do modal (ordem: cotáveis primeiro). */
export const TRANSFER_TYPES: TransferMeta[] = [
  { kind: "plane", label: "Avião", quotable: true },
  { kind: "rental_car", label: "Carro alugado", quotable: true },
  { kind: "bus", label: "Ônibus", quotable: true },
  { kind: "train", label: "Trem", quotable: true },
  { kind: "van", label: "Van / transfer", quotable: true },
  { kind: "own_car", label: "Carro próprio", quotable: false },
  { kind: "on_foot", label: "A pé", quotable: false },
];

const BY_KIND: Record<TransferKind, string> = {
  plane: "Avião",
  rental_car: "Carro alugado",
  own_car: "Carro próprio",
  bus: "Ônibus",
  train: "Trem",
  van: "Van / transfer",
  on_foot: "A pé",
  other: "Outro",
  undecided: "Em discussão",
};

/** Rótulo legível de um translado proposto (usa o texto livre quando `other`). */
export function transferLabel(transfer: TransferDraft | null): string {
  if (!transfer) return "Indefinido";
  if (transfer.kind === "other") {
    return transfer.otherText?.trim() || "Outro";
  }
  return BY_KIND[transfer.kind];
}

/** Um translado proposto já está "definido" (pintado)? `undecided`/`null` não. */
export function isTransferDefined(transfer: TransferDraft | null): boolean {
  return transfer !== null && transfer.kind !== "undecided";
}
