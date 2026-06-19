import type { SegmentMode, StopCreate } from "@traveltogether/types";

// Orquestração do cadastro de Viagem (wizard 6 passos), rodada 0 Espresso.
// Lógica pura: traduz o estado do wizard num PLANO estrutural fiel ao domínio
// (ADR-0018/0019). A server action executa o plano; aqui não há fetch nem FastAPI.
//
// Pilares que o plano garante:
// - Trajetos são DERIVADOS das Paradas (origem→1ª … última→origem), nunca
//   capturados à mão (invariante 8). O organizador não digita aeroporto.
// - Cada Trajeto recebe 1 Rota "direta" com 1 único Trecho, cujo único atributo
//   é o MODO binário (aéreo/terrestre). Sem cidade-via, sem aeroporto.
// - E-mails convidados viram Convites PENDENTES (ADR-0015), nunca Memberships;
//   o criador entra como primeiro Organizador, fora da lista de convites.

export interface WizardStop {
  city: string;
  arrive: string;
  depart: string;
}

export interface WizardState {
  name: string;
  description: string;
  origin: string;
  start: string;
  end: string;
  stops: WizardStop[];
  /** Modo por Trajeto derivado, na ordem (origem→1ª, …, última→origem). */
  legModes: SegmentMode[];
  inviteEmails: string[];
  creatorEmail: string;
}

export interface WizardLegEndpoints {
  from: string;
  to: string;
}

export interface WizardLegPlan extends WizardLegEndpoints {
  index: number;
  route: { label: "direta" };
  segment: { mode: SegmentMode };
}

export interface WizardInvite {
  email: string;
}

export interface WizardTripPlan {
  name: string;
  description: string;
  origin: string;
  start_date: string;
  end_date: string;
}

export interface WizardPlan {
  trip: WizardTripPlan;
  stops: StopCreate[];
  legs: WizardLegPlan[];
  invites: WizardInvite[];
  creatorRole: "organizer";
}

/** Trajetos derivados: origem→1ª Parada, entre Paradas, última→origem. */
export function deriveWizardLegs(origin: string, stops: WizardStop[]): WizardLegEndpoints[] {
  if (stops.length === 0) return [];
  const legs: WizardLegEndpoints[] = [];
  let from = origin;
  for (const stop of stops) {
    legs.push({ from, to: stop.city });
    from = stop.city;
  }
  legs.push({ from, to: origin });
  return legs;
}

function dedupeInvites(emails: string[], creatorEmail: string): WizardInvite[] {
  const skip = creatorEmail.trim().toLowerCase();
  const seen = new Set<string>([skip]);
  const invites: WizardInvite[] = [];
  for (const raw of emails) {
    const email = raw.trim();
    const key = email.toLowerCase();
    if (!email || seen.has(key)) continue;
    seen.add(key);
    invites.push({ email });
  }
  return invites;
}

export function buildWizardPlan(state: WizardState): WizardPlan {
  const legs: WizardLegPlan[] = deriveWizardLegs(state.origin, state.stops).map((leg, index) => ({
    ...leg,
    index,
    route: { label: "direta" },
    segment: { mode: state.legModes[index] ?? "air" },
  }));

  const stops: StopCreate[] = state.stops.map((stop) => ({
    city: stop.city,
    arrival_date: stop.arrive,
    departure_date: stop.depart,
  }));

  return {
    trip: {
      name: state.name,
      description: state.description,
      origin: state.origin,
      start_date: state.start,
      end_date: state.end,
    },
    stops,
    legs,
    invites: dedupeInvites(state.inviteEmails, state.creatorEmail),
    creatorRole: "organizer",
  };
}
