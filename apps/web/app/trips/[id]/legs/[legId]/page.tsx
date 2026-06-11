import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppTopbar } from "@/app/app-topbar";
import { getAuthSession } from "@/auth";
import { getFares } from "@/lib/api/fares";
import { getLegs, getStops, getTrip } from "@/lib/api/trips";
import FaresPanel from "./fares-panel";

interface Props {
  params: Promise<{ id: string; legId: string }>;
}

import type { StopPublic } from "@traveltogether/types";

function stopData(
  stopId: string | null,
  stops: StopPublic[],
  origin: string,
  originAirportCode: string | null,
): { city: string; code: string } {
  if (stopId === null) {
    const code = originAirportCode ?? derivedCode(origin);
    return { city: origin, code };
  }
  const stop = stops.find((s) => s.id === stopId);
  if (!stop) return { city: "Parada", code: "PAR" };
  return { city: stop.city, code: stop.airport_code ?? derivedCode(stop.city) };
}

function derivedCode(value: string): string {
  const match = value.match(/\(([A-Za-z]{3})\)/);
  if (match) return match[1].toUpperCase();
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const letters = normalized.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "AIR").padEnd(3, "X");
}

export default async function LegFaresPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id, legId } = await params;
  const [data, stops, legs, fares] = await Promise.all([
    getTrip(session.apiAccessToken, id),
    getStops(session.apiAccessToken, id),
    getLegs(session.apiAccessToken, id),
    getFares(session.apiAccessToken, legId),
  ]);
  if (!data) notFound();

  const { trip, membership } = data;
  const leg = legs.find((item) => item.id === legId);
  if (!leg) notFound();

  const from = stopData(leg.origin_stop_id, stops, trip.origin, trip.airport_code);
  const to = stopData(leg.destination_stop_id, stops, trip.origin, trip.airport_code);

  return (
    <div className="app-shell">
      <AppTopbar active="trips" />
      <main className="trips-shell">
        <Link className="crumb" href={`/trips/${id}`}>
          ← {trip.name}
        </Link>

        <FaresPanel
          legId={legId}
          tripId={id}
          initialFares={fares}
          role={membership.role}
          fromCode={from.code}
          toCode={to.code}
          fromCity={from.city}
          toCity={to.city}
        />
      </main>
    </div>
  );
}
