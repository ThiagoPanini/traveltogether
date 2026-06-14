import { notFound, redirect } from "next/navigation";

import { AppTopbar } from "@/app/app-topbar";
import { getAuthSession } from "@/auth";
import { Breadcrumbs, CoverGraphic } from "@/components/atlas";
import { getCurrentUser } from "@/lib/api/current-user";
import { getItineraryItems, getStops, getTrip } from "@/lib/api/trips";
import { formatWeekdayDayMonth as fmtDay, nightsBetween } from "@/lib/format/date";
import { displayCode } from "@/lib/trips/journey";
import ItineraryPanel from "./itinerary-panel";

interface Props {
  params: Promise<{ id: string; stopId: string }>;
}

export default async function StopItineraryPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id, stopId } = await params;
  const [data, stops, items, currentUser] = await Promise.all([
    getTrip(session.apiAccessToken, id),
    getStops(session.apiAccessToken, id),
    getItineraryItems(session.apiAccessToken, id, stopId),
    getCurrentUser(session.apiAccessToken),
  ]);
  if (!data) notFound();

  const stop = stops.find((s) => s.id === stopId);
  if (!stop) notFound();

  const { trip, membership } = data;
  const nights = nightsBetween(stop.arrival_date, stop.departure_date);

  return (
    <div className="app-shell">
      <AppTopbar active="trips" />
      <main className="page fadeup">
        <div className="shell" style={{ maxWidth: 880 }}>
          <Breadcrumbs
            items={[
              { label: "Viagens", href: "/trips" },
              { label: trip.name, href: `/trips/${id}` },
              { label: `Roteiro · ${stop.city}` },
            ]}
          />

          <div className="card" style={{ overflow: "hidden", marginBottom: 30 }}>
            <CoverGraphic
              seedText={stop.id}
              codeLabel={stop.airport_code ?? displayCode(stop.city)}
              height={110}
            />
            <div
              style={{
                padding: "20px 26px",
                display: "flex",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1 className="display" style={{ fontSize: 30 }}>
                  Roteiro em {stop.city}
                </h1>
                <div
                  className="mono-num"
                  style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}
                >
                  {fmtDay(stop.arrival_date) ?? "data a definir"}
                  {stop.departure_date ? ` → ${fmtDay(stop.departure_date)}` : ""}
                  {nights ? ` · ${nights} noite${nights !== 1 ? "s" : ""}` : ""}
                </div>
              </div>
              <span className="spacer" style={{ flex: 1 }} />
              <span className="chip outline">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <ItineraryPanel
            tripId={id}
            stopId={stopId}
            currentUserId={currentUser?.id ?? ""}
            initialItems={items}
            role={membership.role}
            arrivalDate={stop.arrival_date}
            departureDate={stop.departure_date}
          />
        </div>
      </main>
    </div>
  );
}
