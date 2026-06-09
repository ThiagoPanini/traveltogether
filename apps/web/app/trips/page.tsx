import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { getTrips } from "@/lib/api/trips";

export default async function TripsPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const items = await getTrips(session.apiAccessToken);

  return (
    <main className="trips-shell">
      <header className="trips-header">
        <div>
          <p className="eyebrow">traveltogether</p>
          <h1>Suas Viagens</h1>
        </div>
        <Link href="/trips/new" className="primary-button trip-new-btn">
          Nova Viagem
        </Link>
      </header>

      {items.length === 0 ? (
        <p className="trips-empty">Nenhuma viagem ainda. Crie a primeira!</p>
      ) : (
        <ul className="trips-list">
          {items.map(({ trip, membership }) => (
            <li key={trip.id} className="trip-card">
              <Link href={`/trips/${trip.id}`} className="trip-card-link">
                <span className="trip-card-name">{trip.name}</span>
                <span className="trip-card-origin">{trip.origin}</span>
                <span className="trip-card-role" data-role={membership.role}>
                  {membership.role === "organizer" ? "Organizador" : "Membro"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
