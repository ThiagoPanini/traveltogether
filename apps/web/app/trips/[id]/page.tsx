import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppTopbar } from "@/app/app-topbar";
import { getAuthSession } from "@/auth";
import { Breadcrumbs, CoverGraphic, Icon, RouteLine, type RoutePoint } from "@/components/atlas";
import CommentThread from "@/components/comment-thread";
import { getCurrentUser } from "@/lib/api/current-user";
import { getFares } from "@/lib/api/fares";
import { getLegs, getStops, getTrip, getTripMembers } from "@/lib/api/trips";
import { formatDayMonth as fmtDay, formatDateRange } from "@/lib/format/date";
import { buildJourneySegments, displayCode } from "@/lib/trips/journey";
import TripSequenceView from "./trip-sequence-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id } = await params;
  const [data, stops, legs, members, currentUser] = await Promise.all([
    getTrip(session.apiAccessToken, id),
    getStops(session.apiAccessToken, id),
    getLegs(session.apiAccessToken, id),
    getTripMembers(session.apiAccessToken, id),
    getCurrentUser(session.apiAccessToken),
  ]);
  if (!data) notFound();

  const accessToken = session.apiAccessToken;

  function moneyValue(raw: string): number {
    const normalized =
      raw.includes(",") && raw.includes(".")
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw.replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  }

  const legFareEntries = await Promise.all(
    legs.map(async (leg) => {
      const fares = await getFares(accessToken, leg.id);
      const chosen = fares.some((f) => f.is_chosen);
      const best = fares.reduce<{ value: string; currency: string } | null>(
        (acc, f) => (!acc || moneyValue(f.value) < moneyValue(acc.value) ? f : acc),
        null,
      );
      return [leg.id, { count: fares.length, chosen, best }] as const;
    }),
  );
  const legInfo = Object.fromEntries(legFareEntries);
  const fareCounts = Object.fromEntries(legFareEntries.map(([id, info]) => [id, info.count]));

  function fmtMoney(value: string, currency: string): string {
    const numeric = moneyValue(value);
    if (!Number.isFinite(numeric)) return `${currency} ${value}`;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(numeric);
  }

  const { trip, membership } = data;
  const activeMembers = members?.members ?? [];
  const pendingMembers = members?.pending ?? [];
  const originCode = trip.airport_code ?? displayCode(trip.origin);

  // route line (Origem → Paradas → Origem)
  const segments = buildJourneySegments(trip.origin, stops, legs, fareCounts);
  const legSegments = segments.flatMap((s) => (s.kind === "leg" ? [s] : []));
  const points: RoutePoint[] = [
    { code: originCode, city: trip.origin, dates: fmtDay(trip.start_date), muted: true },
    ...stops.map((stop) => ({
      code: stop.airport_code ?? displayCode(stop.city),
      city: stop.city,
      dates:
        fmtDay(stop.arrival_date) && fmtDay(stop.departure_date)
          ? `${fmtDay(stop.arrival_date)} – ${fmtDay(stop.departure_date)}`
          : (fmtDay(stop.arrival_date) ?? fmtDay(stop.departure_date)),
    })),
    { code: originCode, city: trip.origin, dates: fmtDay(trip.end_date), muted: true },
  ];
  const edges = legSegments.map((leg) => {
    const info = leg.legId ? legInfo[leg.legId] : undefined;
    const meta = info?.chosen
      ? "✓ escolhida"
      : leg.fareCount
        ? `${leg.fareCount} pesquisa${leg.fareCount > 1 ? "s" : ""}`
        : "sem pesquisas";
    return {
      href: leg.legId ? `/trips/${id}/legs/${leg.legId}` : undefined,
      meta,
      price: info?.best ? fmtMoney(info.best.value, info.best.currency) : undefined,
    };
  });

  return (
    <div className="app-shell">
      <AppTopbar active="trips" />
      <main className="page fadeup">
        <div className="shell">
          <Breadcrumbs items={[{ label: "Viagens", href: "/trips" }, { label: trip.name }]} />

          {/* header */}
          <div className="card" style={{ overflow: "hidden", marginBottom: 28 }}>
            <CoverGraphic
              seedText={trip.id}
              codeLabel={
                stops.map((s) => s.airport_code ?? displayCode(s.city)).join(" · ") || originCode
              }
              height={150}
            />
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 320px" }}>
                  <h1 className="display" style={{ fontSize: 34, marginBottom: 6 }}>
                    {trip.name}
                  </h1>
                  {trip.description && (
                    <p className="soft" style={{ fontSize: 14.5, maxWidth: 560 }}>
                      {trip.description}
                    </p>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    alignItems: "flex-end",
                  }}
                >
                  <span
                    className="mono-num"
                    style={{
                      fontSize: 13,
                      color: "var(--ink-soft)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icon name="calendar" size={13} />{" "}
                    {formatDateRange(trip.start_date, trip.end_date)}
                  </span>
                  <Link
                    className="link-btn"
                    href={`/trips/${id}/members`}
                    style={{ fontSize: 13.5 }}
                  >
                    {activeMembers.length} pessoa{activeMembers.length !== 1 ? "s" : ""} na viagem
                    {pendingMembers.length ? ` · ${pendingMembers.length} pendente(s)` : ""} →
                  </Link>
                  {membership.role === "organizer" && (
                    <Link className="btn tiny ghost" href={`/trips/${id}/edit`}>
                      <Icon name="edit" size={13} /> Editar viagem
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* itinerary route */}
          <div className="section-head">
            <span className="kicker">itinerário</span>
            <h2>Origem → Paradas → Origem</h2>
            <span className="spacer" />
            {stops.length > 0 && (
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                clique num trajeto para ver passagens
              </span>
            )}
          </div>

          {stops.length ? (
            <div className="card" style={{ padding: "22px 26px 16px", marginBottom: 36 }}>
              <RouteLine points={points} edges={edges} />
            </div>
          ) : (
            <div className="empty" style={{ marginBottom: 36 }}>
              <Icon name="pin" size={22} />
              <div style={{ fontWeight: 600, color: "var(--ink-soft)" }}>
                Essa viagem ainda não tem paradas.
              </div>
              <div style={{ fontSize: 13.5, maxWidth: 380 }}>
                Adicione a primeira cidade para o itinerário (e os trajetos) ganharem forma.
              </div>
            </div>
          )}

          {/* stops management */}
          <TripSequenceView tripId={id} initialStops={stops} role={membership.role} />

          {/* mural da viagem — comentários com alvo = a própria Viagem */}
          <div className="section-head" style={{ marginTop: 40 }}>
            <span className="kicker">mural</span>
            <h2>Conversa do grupo</h2>
            <span className="spacer" />
            <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
              recados e combinados da viagem
            </span>
          </div>
          <div className="card" style={{ padding: "8px 24px 18px" }}>
            <CommentThread
              tripId={id}
              targetType="trip"
              targetId={id}
              currentUserId={currentUser?.id ?? ""}
              role={membership.role}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
