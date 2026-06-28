import type { Trajeto } from "./backbone";
import type { TransferKind } from "./draft";

/** Tipos com algo cotável (CONTEXT inv. 8). */
export type ResearchTransferKind = Exclude<TransferKind, "own_car" | "on_foot" | "undecided">;

export type ResearchPriceBasis = "person" | "vehicle";
export type ResearchCurrency = "BRL" | "USD" | "EUR" | "GBP";

/** Um pulo coberto pela Pesquisa. Ida-e-volta gera dois Trechos no mesmo item. */
export type ResearchSegment = {
  id: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  originCode: string;
  destinationCode: string;
};

/** Pesquisa salva localmente enquanto a API da camada de exploração não existe. */
export type FareResearch = {
  id: string;
  trajectoryKey: string;
  transferKind: ResearchTransferKind;
  otherTransfer: string;
  provider: string;
  reference: string;
  link: string;
  segments: ResearchSegment[];
  stops: number | null;
  money: { amount: number; currency: ResearchCurrency } | null;
  points: { amount: number; program: string } | null;
  priceBasis: ResearchPriceBasis;
  notes: string;
  createdAt: string;
};

/** Estado editável do wizard; valores numéricos ficam como texto enquanto o usuário digita. */
export type FareResearchDraft = {
  transferKind: ResearchTransferKind | "";
  otherTransfer: string;
  provider: string;
  reference: string;
  link: string;
  segments: ResearchSegment[];
  includeReturn: boolean;
  stops: string;
  useMoney: boolean;
  moneyAmount: string;
  currency: ResearchCurrency;
  usePoints: boolean;
  pointsAmount: string;
  loyaltyProgram: string;
  priceBasis: ResearchPriceBasis;
  notes: string;
};

type StoredResearches = { version: 1; items: FareResearch[] };

const STORAGE_PREFIX = "travelmanager:fare-researches";
const RESEARCH_KINDS: ResearchTransferKind[] = [
  "plane",
  "rental_car",
  "bus",
  "train",
  "van",
  "other",
];

/** Identidade estável do Trajeto na linha do tempo (inclui índice para pontas coincidentes). */
export function trajectoryKey(trajeto: Trajeto, index: number): string {
  return [trajeto.kind, index, trajeto.from, trajeto.to].join(":");
}

/** O tipo proposto apenas semeia a pesquisa; tipos sem preço deixam a escolha em aberto. */
export function suggestedResearchKind(trajeto: Trajeto): ResearchTransferKind | "" {
  const kind = trajeto.transfer?.kind;
  if (!kind || kind === "undecided" || kind === "own_car" || kind === "on_foot") return "";
  return kind;
}

/** Cria um rascunho novo, sem inventar data de saída a partir da data de chegada do Trajeto. */
export function createFareResearchDraft(trajeto: Trajeto): FareResearchDraft {
  return {
    transferKind: suggestedResearchKind(trajeto),
    otherTransfer: trajeto.transfer?.kind === "other" ? (trajeto.transfer.other_text ?? "") : "",
    provider: "",
    reference: "",
    link: "",
    segments: [createSegment("outbound", trajeto.from, trajeto.to)],
    includeReturn: false,
    stops: "0",
    useMoney: true,
    moneyAmount: "",
    currency: "BRL",
    usePoints: false,
    pointsAmount: "",
    loyaltyProgram: "",
    priceBasis: "person",
    notes: "",
  };
}

/** Reabre uma Pesquisa existente no wizard sem perder seus Trechos ou unidades nativas. */
export function draftFromFareResearch(research: FareResearch): FareResearchDraft {
  return {
    transferKind: research.transferKind,
    otherTransfer: research.otherTransfer,
    provider: research.provider,
    reference: research.reference,
    link: research.link,
    segments: research.segments,
    includeReturn: research.segments.length > 1,
    stops: String(research.stops ?? 0),
    useMoney: research.money !== null,
    moneyAmount: research.money ? String(research.money.amount) : "",
    currency: research.money?.currency ?? "BRL",
    usePoints: research.points !== null,
    pointsAmount: research.points ? String(research.points.amount) : "",
    loyaltyProgram: research.points?.program ?? "",
    priceBasis: research.priceBasis,
    notes: research.notes,
  };
}

/** Adiciona ou remove a volta como segundo Trecho coberto pelo mesmo item. */
export function withReturnSegment(
  draft: FareResearchDraft,
  includeReturn: boolean,
  selectedIsReturn = false,
): FareResearchDraft {
  const selected = selectedIsReturn && draft.includeReturn ? draft.segments[1] : draft.segments[0];
  if (!selected) return draft;
  if (!includeReturn) return { ...draft, includeReturn, segments: [selected] };
  if (draft.includeReturn && draft.segments.length > 1) return draft;
  const segments = selectedIsReturn
    ? [createSegment("outbound", selected.to, selected.from), { ...selected, id: "return" }]
    : [selected, createSegment("return", selected.to, selected.from)];
  return { ...draft, includeReturn, segments };
}

/** Converte o rascunho válido na entidade exibida pelo painel. */
export function fareResearchFromDraft(
  draft: FareResearchDraft,
  key: string,
  id: string,
  createdAt = new Date().toISOString(),
): FareResearch {
  if (!draft.transferKind) {
    throw new Error("tipo de translado ausente");
  }
  const moneyAmount = parsePositiveNumber(draft.moneyAmount);
  const pointsAmount = parsePositiveNumber(draft.pointsAmount);
  return {
    id,
    trajectoryKey: key,
    transferKind: draft.transferKind,
    otherTransfer: draft.otherTransfer.trim(),
    provider: draft.provider.trim(),
    reference: draft.reference.trim(),
    link: safeResearchLink(draft.link),
    segments: draft.segments.map((segment) => ({
      ...segment,
      from: segment.from.trim(),
      to: segment.to.trim(),
      originCode: segment.originCode.trim().toUpperCase(),
      destinationCode: segment.destinationCode.trim().toUpperCase(),
    })),
    stops: draft.transferKind === "plane" ? Number(draft.stops || 0) : null,
    money:
      draft.useMoney && moneyAmount > 0 ? { amount: moneyAmount, currency: draft.currency } : null,
    points:
      draft.transferKind === "plane" && draft.usePoints && pointsAmount > 0
        ? { amount: pointsAmount, program: draft.loyaltyProgram.trim() }
        : null,
    priceBasis: draft.priceBasis,
    notes: draft.notes.trim(),
    createdAt,
  };
}

/** Valida apenas o passo atual para manter o wizard progressivo e explicável. */
export function validateFareResearchStep(draft: FareResearchDraft, step: number): string[] {
  if (step === 1) {
    if (!draft.transferKind) return ["Escolha o tipo de translado."];
    if (draft.transferKind === "other" && !draft.otherTransfer.trim()) {
      return ["Dê um nome ao outro tipo de translado."];
    }
    return [];
  }
  if (step === 2) {
    const errors: string[] = [];
    if (!draft.provider.trim()) errors.push("Informe a empresa ou plataforma.");
    if (draft.link.trim() && !safeResearchLink(draft.link)) {
      errors.push("Use um link completo começando por http:// ou https://.");
    }
    draft.segments.forEach((segment, index) => {
      const suffix =
        draft.segments.length > 1 ? (index === 0 ? "da ida" : "da volta") : "do trecho";
      if (!segment.departureDate) errors.push(`Informe a data ${suffix}.`);
      if (draft.transferKind === "plane") {
        if (!/^[A-Za-z]{3}$/.test(segment.originCode.trim())) {
          errors.push(`Informe o aeroporto de origem ${suffix} com 3 letras.`);
        }
        if (!/^[A-Za-z]{3}$/.test(segment.destinationCode.trim())) {
          errors.push(`Informe o aeroporto de destino ${suffix} com 3 letras.`);
        }
      }
    });
    return errors;
  }
  if (step === 3) {
    const errors: string[] = [];
    const validMoney = draft.useMoney && parsePositiveNumber(draft.moneyAmount) > 0;
    const validPoints =
      draft.transferKind === "plane" &&
      draft.usePoints &&
      parsePositiveNumber(draft.pointsAmount) > 0 &&
      draft.loyaltyProgram.trim().length > 0;
    if (!validMoney && !validPoints) errors.push("Informe um valor em dinheiro e/ou pontos.");
    if (draft.useMoney && !validMoney) errors.push("Informe um valor em dinheiro maior que zero.");
    if (draft.transferKind === "plane" && draft.usePoints) {
      if (parsePositiveNumber(draft.pointsAmount) <= 0)
        errors.push("Informe a quantidade de pontos.");
      if (!draft.loyaltyProgram.trim()) errors.push("Informe o programa de fidelidade.");
    }
    return [...new Set(errors)];
  }
  return [];
}

/** Formata dinheiro na unidade nativa; não converte nem compara moedas. */
export function formatResearchMoney(research: FareResearch): string | null {
  if (!research.money) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: research.money.currency,
    maximumFractionDigits: 2,
  }).format(research.money.amount);
}

/** Formata pontos junto do programa, mantendo programas distintos incomparáveis. */
export function formatResearchPoints(research: FareResearch): string | null {
  if (!research.points) return null;
  const amount = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    research.points.amount,
  );
  return `${amount} pts · ${research.points.program}`;
}

export function loadFareResearches(tripId: string): FareResearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    if (!raw) return [];
    const stored = JSON.parse(raw) as StoredResearches;
    return stored.version === 1 && Array.isArray(stored.items)
      ? stored.items.filter(isFareResearch)
      : [];
  } catch {
    return [];
  }
}

export function saveFareResearches(tripId: string, items: FareResearch[]): void {
  if (typeof window === "undefined") return;
  const payload: StoredResearches = { version: 1, items };
  window.localStorage.setItem(storageKey(tripId), JSON.stringify(payload));
}

function createSegment(id: string, from: string, to: string): ResearchSegment {
  return {
    id,
    from,
    to,
    departureDate: "",
    departureTime: "",
    originCode: "",
    destinationCode: "",
  };
}

function storageKey(tripId: string): string {
  return `${STORAGE_PREFIX}:${tripId}`;
}

function parsePositiveNumber(value: string): number {
  const compact = value.trim().replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(compact)
      ? compact.replace(/\./g, "")
      : compact;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeResearchLink(value: string): string {
  const candidate = value.trim();
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function isFareResearch(value: unknown): value is FareResearch {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FareResearch>;
  return (
    typeof item.id === "string" &&
    typeof item.trajectoryKey === "string" &&
    RESEARCH_KINDS.includes(item.transferKind as ResearchTransferKind) &&
    typeof item.provider === "string" &&
    Array.isArray(item.segments) &&
    item.segments.length > 0 &&
    item.segments.every(
      (segment) =>
        typeof segment?.id === "string" &&
        typeof segment.from === "string" &&
        typeof segment.to === "string" &&
        typeof segment.departureDate === "string",
    ) &&
    (item.priceBasis === "person" || item.priceBasis === "vehicle")
  );
}
