import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/auth";
import { getTrips } from "@/lib/api/trips";
import { AppTopbar } from "../app-topbar";

function displayCode(value: string): string {
  const match = value.match(/\(([A-Za-z]{3})\)/);
  if (match) return match[1].toUpperCase();
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const letters = normalized.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "TT").padEnd(3, "X");
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return "Datas a definir";
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  if (startDate && endDate) return `${format(startDate)} - ${format(endDate)}`;
  return format(startDate ?? endDate ?? "");
}

function coverTone(value: string): number {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5;
}

export default async function TripsPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const items = await getTrips(session.apiAccessToken);

  return (
    <div className="app-shell">
      <AppTopbar active="trips" />
      <main className="trips-shell">
        <header className="trips-header">
          <div>
            <p className="eyebrow">manifesto de embarques</p>
            <h1>Suas Viagens</h1>
          </div>
          <Link href="/trips/new" className="primary-button trip-new-btn">
            + Nova Viagem
          </Link>
        </header>

        {items.length === 0 ? (
          <p className="trips-empty">Nenhuma viagem ainda. Emita o primeiro cartão.</p>
        ) : (
          <ul className="trips-list">
            {items.map(({ trip, membership, stops }) => {
              const route = [
                {
                  key: "origin",
                  code: trip.airport_code ?? displayCode(trip.origin),
                  city: trip.origin,
                },
                ...stops.map((stop) => ({
                  key: stop.id,
                  code: stop.airport_code ?? displayCode(stop.city),
                  city: stop.city,
                })),
              ];
              const stopCount = stops.length;
              return (
                <li key={trip.id} className="bp bp-card">
                  <Link href={`/trips/${trip.id}`} className="bp-card-link">
                    <div className="cover" data-tone={coverTone(trip.name)}>
                      <span className="cover-skyline" />
                      <span className="cover-note">
                        {formatDateRange(trip.start_date, trip.end_date)}
                      </span>
                      <span className="cover-caption">{trip.name}</span>
                    </div>
                    <span className="bp-name">{trip.name}</span>
                    <span className="bp-route-summary">
                      {route.map((point, index) => (
                        <span className="bp-route-seg" key={point.key}>
                          <span className="bp-route-point">
                            <span className="bp-iata">{point.code}</span>
                            <span className="bp-city">{point.city}</span>
                          </span>
                          {index < route.length - 1 && (
                            <span className="bp-connector" aria-hidden="true">
                              ✈
                            </span>
                          )}
                        </span>
                      ))}
                    </span>
                    <span className="perf" />
                    <span className="bp-stub">
                      <span>
                        <span className="stub-label">papel</span>
                        <span className="trip-card-role" data-role={membership.role}>
                          {membership.role === "organizer" ? "Organizador" : "Membro"}
                        </span>
                      </span>
                      <span>
                        <span className="stub-label">rota</span>
                        <span className="stub-value">
                          {stopCount === 0
                            ? "sem paradas"
                            : `${stopCount} ${stopCount === 1 ? "parada" : "paradas"}`}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
