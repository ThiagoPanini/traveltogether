"use server";

import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { addSegment, createRoute } from "@/lib/api/routes";
import { addMember, createStop, createTrip, getLegs } from "@/lib/api/trips";
import { buildWizardPlan, type WizardState } from "@/lib/trips/wizard";

/** Resultado do cadastro: sucesso traz o id da Viagem; falha vira `null`. */
export type WizardSubmitResult = { ok: true; tripId: string } | null;

/**
 * Executa o cadastro do wizard (rodada 0 Espresso) seguindo o PLANO puro de
 * `buildWizardPlan`: cria a Viagem → Paradas em ordem (Trajetos derivam na API)
 * → para cada Trajeto derivado, 1 Rota "direta" com 1 Trecho do modo escolhido
 * → convida e-mails como Convites pendentes.
 *
 * Não redireciona no servidor (#168): devolve sucesso para o cliente tocar o
 * carimbo "Viagem criada" antes de navegar ao Painel.
 */
export async function createTripFromWizardAction(state: WizardState): Promise<WizardSubmitResult> {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");
  const token = session.apiAccessToken;

  const plan = buildWizardPlan(state);

  const trip = await createTrip(token, plan.trip);
  if (!trip) return null;
  const tripId = trip.trip.id;

  for (const stop of plan.stops) {
    await createStop(token, tripId, stop);
  }

  // Trajetos já derivados pela API; casa cada um ao plano pela ordem.
  const legs = (await getLegs(token, tripId)).sort((a, b) => a.order - b.order);
  for (let i = 0; i < legs.length; i++) {
    const legPlan = plan.legs[i];
    if (!legPlan) continue;
    const route = await createRoute(token, tripId, legs[i].id, { label: legPlan.route.label });
    if (!route) continue;
    await addSegment(token, tripId, legs[i].id, route.id, { mode: legPlan.segment.mode });
  }

  for (const invite of plan.invites) {
    await addMember(token, tripId, invite.email);
  }

  return { ok: true, tripId };
}
