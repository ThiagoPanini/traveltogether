import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppTopbar } from "@/app/app-topbar";
import { getAuthSession } from "@/auth";
import { getFares } from "@/lib/api/fares";
import { getLegs, getStops, getTrip, getTripMembers } from "@/lib/api/trips";
import LegsPanel from "./legs-panel";
import StopsPanel from "./stops-panel";

interface Props {
  params: Promise<{ id: string }>;
}

function displayCode(value: string): string {
  const match = value.match(/\(([A-Za-z]{3})\)/);
  if (match) return match[1].toUpperCase();
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const letters = normalized.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "TT").padEnd(3, "X");
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export default async function TripDetailPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id } = await params;
  const [data, stops, legs, members] = await Promise.all([
    getTrip(session.apiAccessToken, id),
    getStops(session.apiAccessToken, id),
    getLegs(session.apiAccessToken, id),
    getTripMembers(session.apiAccessToken, id),
  ]);
  if (!data) notFound();

  const accessToken = session.apiAccessToken;
  const fareCountEntries = await Promise.all(
    legs.map(async (leg) => [leg.id, (await getFares(accessToken, leg.id)).length] as const),
  );
  const fareCounts = Object.fromEntries(fareCountEntries);

  const { trip, membership } = data;
  const yearSuffix = String(new Date(trip.created_at).getFullYear()).slice(2);
  const route = [
    { code: displayCode(trip.origin), key: "origin-out" },
    ...stops.map((stop) => ({ code: displayCode(stop.city), key: stop.id })),
    { code: displayCode(trip.origin), key: "origin-back" },
  ];
  const activeMembers = members?.members ?? [];
  const pendingMembers = members?.pending ?? [];

  return (
    <div className="app-shell">
      <AppTopbar active="trips" />
      <main className="trips-shell">
        <Link className="crumb" href="/trips">
          ← Viagens
        </Link>
        <header className="trips-header">
          <div>
            <p className="eyebrow">cartão de embarque · viagem</p>
            <h1>
              {trip.name}{" "}
              <span
                style={{
                  color: "var(--text-faint)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "1.1rem",
                  fontWeight: 400,
                }}
              >
                &apos;{yearSuffix}
              </span>
            </h1>
          </div>
          <span className="trip-card-role" data-role={membership.role}>
            {membership.role === "organizer" ? "Organizador" : "Membro"}
          </span>
        </header>

        <section className="bp hero-bp" aria-label="Itinerário da viagem">
          <div className="bp-head">
            <span>Itinerário</span>
            <span className="flight">{new Date(trip.created_at).getFullYear()}</span>
          </div>
          <div className="hero-flightstrip">
            {route.map((item, index) => (
              <span className="hero-seg" key={item.key}>
                <span className={index === 0 || index === route.length - 1 ? "iata home" : "iata"}>
                  {item.code}
                </span>
                {index < route.length - 1 && <span className="arrow">✈</span>}
              </span>
            ))}
          </div>
          <div className="perf" />
          <div className="hero-info">
            <div>
              <div className="k">origem</div>
              <div className="v">{trip.origin}</div>
            </div>
            <div>
              <div className="k">paradas</div>
              <div className="v">{stops.length}</div>
            </div>
            <div>
              <div className="k">trajetos</div>
              <div className="v">{legs.length}</div>
            </div>
            <div>
              <div className="k">passageiros</div>
              <div className="v">{activeMembers.length}</div>
            </div>
          </div>
        </section>

        {trip.description && <p className="trip-detail-desc">{trip.description}</p>}

        <section className="trip-detail-section">
          <h2>Paradas</h2>
          <StopsPanel tripId={id} initialStops={stops} role={membership.role} />
        </section>

        <section className="trip-detail-section">
          <h2>Trajetos · passagens</h2>
          <LegsPanel
            tripId={id}
            origin={trip.origin}
            initialLegs={legs}
            stops={stops}
            fareCounts={fareCounts}
          />
        </section>

        <section className="trip-detail-section">
          <h2>Tripulação</h2>
          <div className="member-row">
            {activeMembers.slice(0, 5).map(({ membership: member, email }, index) => (
              <span
                className="member-avatar"
                key={member.id}
                style={{ marginLeft: index ? "-0.55rem" : 0 }}
                title={email}
              >
                {initials(email)}
              </span>
            ))}
            <span className="member-email">
              {activeMembers.length} a bordo
              {pendingMembers.length ? ` · ${pendingMembers.length} pendente(s)` : ""}
            </span>
            <Link className="secondary-button btn-sm" href={`/trips/${id}/members`}>
              Gerenciar tripulação
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
