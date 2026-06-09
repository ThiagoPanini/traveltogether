import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { getTrip } from "@/lib/api/trips";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id } = await params;
  const data = await getTrip(session.apiAccessToken, id);
  if (!data) notFound();

  const { trip, membership } = data;

  return (
    <main className="trips-shell">
      <header className="trips-header">
        <div>
          <p className="eyebrow">
            <Link href="/trips">← Viagens</Link>
          </p>
          <h1>{trip.name}</h1>
          <p className="trip-detail-origin">{trip.origin}</p>
        </div>
        <span className="trip-card-role" data-role={membership.role}>
          {membership.role === "organizer" ? "Organizador" : "Membro"}
        </span>
      </header>

      {trip.description && <p className="trip-detail-desc">{trip.description}</p>}

      <section className="trip-detail-section">
        <h2>Itinerário</h2>
        <p className="trips-empty">Paradas e Trajetos chegam no próximo issue.</p>
      </section>

      <section className="trip-detail-section">
        <h2>Membros</h2>
        <Link
          className="secondary-button trip-new-btn"
          href={`/trips/${id}/members`}
          style={{ display: "inline-flex" }}
        >
          Gerenciar Membros
        </Link>
      </section>
    </main>
  );
}
