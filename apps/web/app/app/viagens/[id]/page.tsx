import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/bff/server";
import { deriveTrajetos, formatTripDate, type TripBackbone } from "@/lib/trips/backbone";
import { TripPanel } from "./trip-panel";

export const metadata: Metadata = {
  title: "Viagem · travel·manager",
};

/**
 * Painel da Viagem sobre o `TripBackboneRead` (`GET /trips/{id}`, 404 → `notFound`, não vaza
 * existência — ADR-0011). O server component continua fino: busca dado real e entrega a casca
 * navegável do redesign para o cliente.
 */
export default async function ViagemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch(`/trips/${encodeURIComponent(id)}`);
  if (!res.ok) {
    notFound();
  }
  const trip = (await res.json()) as TripBackbone;

  return (
    <TripPanel
      trip={trip}
      trajetos={deriveTrajetos(trip).filter((trajeto) => trajeto.kind !== "volta-seed")}
      departureLabel={formatTripDate(trip.departure_date)}
    />
  );
}
