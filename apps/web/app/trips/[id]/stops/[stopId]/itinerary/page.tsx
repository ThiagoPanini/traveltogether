import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppTopbar } from "@/app/app-topbar";
import { getAuthSession } from "@/auth";
import { getItineraryItems, getStops, getTrip } from "@/lib/api/trips";
import ItineraryPanel from "./itinerary-panel";

interface Props {
  params: Promise<{ id: string; stopId: string }>;
}

export default async function StopItineraryPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id, stopId } = await params;
  const [data, stops, items] = await Promise.all([
    getTrip(session.apiAccessToken, id),
    getStops(session.apiAccessToken, id),
    getItineraryItems(session.apiAccessToken, id, stopId),
  ]);
  if (!data) notFound();

  const stop = stops.find((s) => s.id === stopId);
  if (!stop) notFound();

  const { trip, membership } = data;

  return (
    <div className="app-shell">
      <AppTopbar active="trips" />
      <main className="trips-shell">
        <Link className="crumb" href={`/trips/${id}`}>
          ← {trip.name}
        </Link>
        <header className="trips-header">
          <div>
            <p className="eyebrow">roteiro · parada</p>
            <h1>{stop.city}</h1>
          </div>
          <span className="trip-card-role" data-role={membership.role}>
            {membership.role === "organizer" ? "Organizador" : "Membro"}
          </span>
        </header>

        <section className="trip-detail-section">
          <h2>Roteiro</h2>
          <ItineraryPanel tripId={id} stopId={stopId} initialItems={items} role={membership.role} />
        </section>
      </main>
    </div>
  );
}
