import type { FareQuotePublic } from "@traveltogether/types";

export interface FareRow extends FareQuotePublic {
  upvote_count: number;
}

export type SortKey = "price" | "upvotes";

export function sortFares(fares: FareRow[], key: SortKey): FareRow[] {
  return [...fares].sort((a, b) => {
    if (a.is_chosen !== b.is_chosen) return a.is_chosen ? -1 : 1;
    if (key === "price") return parseFloat(a.value) - parseFloat(b.value);
    return b.upvote_count - a.upvote_count;
  });
}
