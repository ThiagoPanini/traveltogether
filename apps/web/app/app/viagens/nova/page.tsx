import type { Metadata } from "next";
import { apiFetch } from "@/lib/bff/server";
import { TripWizard } from "./trip-wizard";
import type { Origin } from "./wizard-types";

export const metadata: Metadata = {
  title: "Nova viagem · travel·manager",
};

type Me = {
  profile: { origin_city?: string | null; country?: string | null } | null;
};

/**
 * Tela de criação de viagem (Fase 3). Server component: busca o Perfil de quem cria
 * (`/auth/me`) para a **origem** da rota (derivada do Perfil — inv. 6) e renderiza o
 * wizard client. A origem nunca vai no payload; é só exibição ("ORIGEM · VOCÊ").
 */
export default async function NovaViagemPage() {
  let origin: Origin = { city: null, country: null };

  const res = await apiFetch("/auth/me");
  if (res.ok) {
    const me = (await res.json()) as Me;
    origin = {
      city: me.profile?.origin_city?.trim() || null,
      country: me.profile?.country?.trim() || null,
    };
  }

  return <TripWizard origin={origin} />;
}
