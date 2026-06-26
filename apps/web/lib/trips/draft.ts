/**
 * Rascunho da criação de viagem (Fase 3) — reducer puro + tipos + mapeamento para
 * o payload da API e persistência em localStorage.
 *
 * O wizard de 6 passos vive todo no cliente; o servidor só conhece viagens reais
 * (sem status `draft` — ADR-0011). Este módulo é a única fonte da lógica do rascunho
 * e o seam de teste primário: o reducer é puro e o mapeamento `draftToPayload` é o
 * contrato com o BFF (ver `CONTRACT.md` / ADR-0011).
 *
 * Invariantes (sempre verdadeiras após qualquer ação):
 * - `stops` tem ao menos 1 parada; a **última é o destino** (derivado — CONTEXT).
 * - `stops[0].desiredTransfer` é **sempre null** (o salto que chega na 1ª parada é a
 *   ponta pessoal `entryTransfer`, no Membership). Saltos compartilhados nascem
 *   `undecided` ("ainda em discussão").
 * - A origem **não** é uma Parada: é derivada do Perfil de quem vê (inv. 6).
 */

/** Tipo de translado (translado multi-modal — ADR-0009). `undecided` = em discussão. */
export type TransferKind =
  | "plane"
  | "rental_car"
  | "own_car"
  | "bus"
  | "train"
  | "van"
  | "on_foot"
  | "other"
  | "undecided";

/** Papel numa Participação/Convite (ADR-0002). */
export type InviteRole = "member" | "organizer";

/** Translado proposto (hint) — `otherText` só é significativo quando `kind === "other"`. */
export type TransferDraft = { kind: TransferKind; otherText?: string };

/** Parada do rascunho. A última da lista é o destino. */
export type StopDraft = {
  id: string;
  city: string;
  country: string | null;
  arrivalDate: string | null;
  /** Proposta do salto compartilhado parada[i-1]→parada[i]; `null` só no índice 0. */
  desiredTransfer: TransferDraft | null;
};

/** Convite cego do rascunho — só e-mail + papel (ADR-0002). */
export type InviteDraft = { email: string; role: InviteRole };

/** O rascunho inteiro do wizard. */
export type TripDraft = {
  step: number;
  name: string;
  description: string;
  departureDate: string | null;
  entryTransfer: TransferDraft | null;
  stops: StopDraft[];
  invitations: InviteDraft[];
};

/** Translado no formato do payload da API (`other_text` snake-case, null fora de `other`). */
export type TransferPayload = { kind: TransferKind; other_text: string | null };

/** Parada no formato do payload da API. */
export type StopPayload = {
  city: string;
  country: string | null;
  arrival_date: string | null;
  desired_transfer: TransferPayload | null;
};

/** Convite no formato do payload da API. */
export type InvitePayload = { email: string; role: InviteRole };

/** Corpo de `POST /trips` (TripCreateIn — contrato congelado). */
export type TripCreateIn = {
  name: string;
  description: string | null;
  departure_date: string | null;
  entry_transfer: TransferPayload | null;
  stops: StopPayload[];
  invitations: InvitePayload[];
};

export const MIN_STEP = 1;
export const MAX_STEP = 6;
export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 220;

/** Chave do rascunho no localStorage (versionada). */
export const STORAGE_KEY = "tm:trip-draft:v1";

/** Gera um id único para uma parada nova (com fallback fora de ambientes com WebCrypto). */
function makeId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `s-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function blankStop(): StopDraft {
  return {
    id: makeId(),
    city: "",
    country: null,
    arrivalDate: null,
    desiredTransfer: { kind: "undecided" },
  };
}

/** Rascunho inicial: passo 1 e uma única parada que já é o destino. */
export function createInitialDraft(): TripDraft {
  return {
    step: MIN_STEP,
    name: "",
    description: "",
    departureDate: null,
    entryTransfer: null,
    stops: [{ id: makeId(), city: "", country: null, arrivalDate: null, desiredTransfer: null }],
    invitations: [],
  };
}

/** A parada de destino (a última da sequência). */
export function getDestination(draft: TripDraft): StopDraft {
  return draft.stops[draft.stops.length - 1];
}

/** As paradas intermediárias (tudo menos o destino). */
export function getMiddleStops(draft: TripDraft): StopDraft[] {
  return draft.stops.slice(0, -1);
}

/** Pode submeter? Nome e cidade de destino preenchidos. */
export function canSubmit(draft: TripDraft): boolean {
  return draft.name.trim().length > 0 && getDestination(draft).city.trim().length > 0;
}

/**
 * Garante a invariante de translado por posição: `stops[0]` sem salto compartilhado
 * (null) e demais ao menos `undecided`. Preserva a referência quando nada muda.
 */
function normalizeStops(stops: StopDraft[]): StopDraft[] {
  return stops.map((stop, i) => {
    if (i === 0) {
      return stop.desiredTransfer === null ? stop : { ...stop, desiredTransfer: null };
    }
    if (stop.desiredTransfer === null) {
      return { ...stop, desiredTransfer: { kind: "undecided" } };
    }
    return stop;
  });
}

function clampStep(step: number): number {
  if (step < MIN_STEP) return MIN_STEP;
  if (step > MAX_STEP) return MAX_STEP;
  return Math.trunc(step);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Ações do reducer do rascunho. */
export type TripDraftAction =
  | { type: "replace"; draft: TripDraft }
  | { type: "reset" }
  | { type: "setStep"; step: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "setName"; name: string }
  | { type: "setDescription"; description: string }
  | { type: "setDeparture"; date: string | null }
  | { type: "setDestination"; city: string; country: string | null }
  | { type: "setStopLocation"; id: string; city: string; country: string | null }
  | { type: "addStop"; index?: number }
  | { type: "insertStop"; index: number; city: string; country: string | null }
  | { type: "removeStop"; id: string }
  | { type: "moveStop"; id: string; direction: "up" | "down" }
  | { type: "setStopDate"; id: string; date: string | null }
  | { type: "setStopTransfer"; id: string; transfer: TransferDraft | null }
  | { type: "setEntryTransfer"; transfer: TransferDraft | null }
  | { type: "addInvite"; email: string; role?: InviteRole }
  | { type: "removeInvite"; email: string }
  | { type: "setInviteRole"; email: string; role: InviteRole };

/**
 * Reducer puro do rascunho. Mantém as invariantes de paradas após cada mutação
 * estrutural via `normalizeStops`.
 */
export function tripDraftReducer(draft: TripDraft, action: TripDraftAction): TripDraft {
  switch (action.type) {
    case "replace":
      return { ...action.draft, stops: normalizeStops(action.draft.stops) };

    case "reset":
      return createInitialDraft();

    case "setStep":
      return { ...draft, step: clampStep(action.step) };

    case "next":
      return { ...draft, step: clampStep(draft.step + 1) };

    case "prev":
      return { ...draft, step: clampStep(draft.step - 1) };

    case "setName":
      return { ...draft, name: action.name.slice(0, NAME_MAX) };

    case "setDescription":
      return { ...draft, description: action.description.slice(0, DESCRIPTION_MAX) };

    case "setDeparture":
      return { ...draft, departureDate: action.date };

    case "setDestination": {
      const last = draft.stops.length - 1;
      const stops = draft.stops.map((stop, i) =>
        i === last ? { ...stop, city: action.city, country: action.country } : stop,
      );
      return { ...draft, stops };
    }

    case "setStopLocation": {
      // Edita cidade/país de uma parada **por id** (qualquer posição, inclusive o
      // destino). Sem isto, só o destino seria editável e as paradas do meio ficariam
      // mudas (ou corromperiam o destino) — ver CONTRACT "Modelo de paradas".
      const stops = draft.stops.map((stop) =>
        stop.id === action.id ? { ...stop, city: action.city, country: action.country } : stop,
      );
      return { ...draft, stops };
    }

    case "addStop": {
      // Insere uma parada em branco entre cards; nunca depois do destino.
      const maxIndex = draft.stops.length - 1;
      const rawIndex = action.index ?? maxIndex;
      const index = Math.max(0, Math.min(rawIndex, maxIndex));
      const stops = [...draft.stops];
      stops.splice(index, 0, blankStop());
      return { ...draft, stops: normalizeStops(stops) };
    }

    case "insertStop": {
      // Encaixa uma parada **já preenchida** num gap (passo 2: + circular → busca de
      // cidade). Mesma régua do `addStop` (nunca depois do destino), mas com cidade/país.
      const maxIndex = draft.stops.length - 1;
      const index = Math.max(0, Math.min(action.index, maxIndex));
      const stops = [...draft.stops];
      stops.splice(index, 0, {
        ...blankStop(),
        city: action.city,
        country: action.country,
      });
      return { ...draft, stops: normalizeStops(stops) };
    }

    case "removeStop": {
      if (draft.stops.length <= 1) return draft;
      const stops = draft.stops.filter((stop) => stop.id !== action.id);
      if (stops.length === draft.stops.length) return draft;
      return { ...draft, stops: normalizeStops(stops) };
    }

    case "moveStop": {
      // Só reordena paradas do meio (índices 0..length-2); o destino fica fixo.
      const lastMovable = draft.stops.length - 2;
      if (lastMovable < 0) return draft;
      const i = draft.stops.findIndex((stop) => stop.id === action.id);
      if (i < 0 || i > lastMovable) return draft;
      const target = action.direction === "up" ? i - 1 : i + 1;
      if (target < 0 || target > lastMovable) return draft;
      const stops = [...draft.stops];
      [stops[i], stops[target]] = [stops[target], stops[i]];
      return { ...draft, stops: normalizeStops(stops) };
    }

    case "setStopDate": {
      const stops = draft.stops.map((stop) =>
        stop.id === action.id ? { ...stop, arrivalDate: action.date } : stop,
      );
      return { ...draft, stops };
    }

    case "setStopTransfer": {
      // A 1ª parada não tem salto compartilhado; ignora.
      if (draft.stops[0]?.id === action.id) return draft;
      const stops = normalizeStops(
        draft.stops.map((stop) =>
          stop.id === action.id ? { ...stop, desiredTransfer: action.transfer } : stop,
        ),
      );
      return { ...draft, stops };
    }

    case "setEntryTransfer":
      return { ...draft, entryTransfer: action.transfer };

    case "addInvite": {
      const email = normalizeEmail(action.email);
      if (!email) return draft;
      if (draft.invitations.some((inv) => inv.email === email)) return draft;
      return {
        ...draft,
        invitations: [...draft.invitations, { email, role: action.role ?? "member" }],
      };
    }

    case "removeInvite": {
      const email = normalizeEmail(action.email);
      return { ...draft, invitations: draft.invitations.filter((inv) => inv.email !== email) };
    }

    case "setInviteRole": {
      const email = normalizeEmail(action.email);
      return {
        ...draft,
        invitations: draft.invitations.map((inv) =>
          inv.email === email ? { ...inv, role: action.role } : inv,
        ),
      };
    }

    default:
      return draft;
  }
}

function toTransferPayload(transfer: TransferDraft | null): TransferPayload | null {
  if (!transfer) return null;
  const otherText = transfer.kind === "other" ? transfer.otherText?.trim() || null : null;
  return { kind: transfer.kind, other_text: otherText };
}

/**
 * Mapeia o rascunho para o corpo de `POST /trips`. Força `stops[0].desired_transfer`
 * a `null` (salto pessoal) e normaliza e-mails de convite para lowercase (contrato).
 */
export function draftToPayload(draft: TripDraft): TripCreateIn {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    departure_date: draft.departureDate,
    entry_transfer: toTransferPayload(draft.entryTransfer),
    stops: draft.stops.map((stop, i) => ({
      city: stop.city.trim(),
      country: stop.country,
      arrival_date: stop.arrivalDate,
      desired_transfer:
        i === 0 ? null : toTransferPayload(stop.desiredTransfer ?? { kind: "undecided" }),
    })),
    invitations: draft.invitations.map((inv) => ({
      email: normalizeEmail(inv.email),
      role: inv.role,
    })),
  };
}

function isTripDraft(value: unknown): value is TripDraft {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.step === "number" &&
    typeof v.name === "string" &&
    typeof v.description === "string" &&
    Array.isArray(v.stops) &&
    v.stops.length >= 1 &&
    Array.isArray(v.invitations)
  );
}

/** Lê o rascunho do localStorage (SSR-safe; `null` se ausente ou malformado). */
export function loadDraft(): TripDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isTripDraft(parsed)) return null;
    return { ...parsed, stops: normalizeStops(parsed.stops) };
  } catch {
    return null;
  }
}

/** Persiste o rascunho no localStorage (SSR-safe; silencioso em falha). */
export function saveDraft(draft: TripDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Quota cheia / modo privado: o rascunho segue em memória, sem quebrar o wizard.
  }
}

/** Apaga o rascunho do localStorage (SSR-safe). */
export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignora — limpar é best-effort.
  }
}
