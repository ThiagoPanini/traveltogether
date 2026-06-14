import type { FareQuotePublic, LegPublic } from "@traveltogether/types";

export interface LegBudgetItem {
  legId: string;
  order: number;
  chosen: FareQuotePublic | null;
}

export interface BudgetSummary {
  legs: LegBudgetItem[];
  totalByCurrency: Record<string, number>;
  perPersonByCurrency: Record<string, number>;
  memberCount: number;
  hasMixedCurrencies: boolean;
  hasUndecided: boolean;
}

export function computeBudget(
  legs: LegPublic[],
  chosenFaresByLeg: Record<string, FareQuotePublic | null>,
  memberCount: number,
): BudgetSummary {
  const sorted = [...legs].sort((a, b) => a.order - b.order);

  const budgetLegs: LegBudgetItem[] = sorted.map((leg) => ({
    legId: leg.id,
    order: leg.order,
    chosen: chosenFaresByLeg[leg.id] ?? null,
  }));

  const totalByCurrency: Record<string, number> = {};
  for (const { chosen } of budgetLegs) {
    if (chosen === null) continue;
    const amount = Number.parseFloat(chosen.value);
    totalByCurrency[chosen.currency] = (totalByCurrency[chosen.currency] ?? 0) + amount;
  }

  const divisor = Math.max(memberCount, 1);
  const perPersonByCurrency: Record<string, number> = {};
  for (const [currency, total] of Object.entries(totalByCurrency)) {
    perPersonByCurrency[currency] = total / divisor;
  }

  return {
    legs: budgetLegs,
    totalByCurrency,
    perPersonByCurrency,
    memberCount,
    hasMixedCurrencies: Object.keys(totalByCurrency).length > 1,
    hasUndecided: budgetLegs.some((l) => l.chosen === null),
  };
}
