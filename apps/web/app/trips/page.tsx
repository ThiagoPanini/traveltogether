import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Code, CoverGraphic, Icon } from "@/components/atlas";
import { activityHref, activityKindLabel } from "@/lib/activity/activity-item";
import { getRecentActivity } from "@/lib/api/activity";
import { getCurrentUser } from "@/lib/api/current-user";
import { getFares } from "@/lib/api/fares";
import { getPendingActions } from "@/lib/api/pending";
import { getLegs, getTrips } from "@/lib/api/trips";
import { countdownDays, selectNextTrip } from "@/lib/dashboard/next-trip";
import { toPendingItem } from "@/lib/dashboard/pending";
import { formatDateRange } from "@/lib/format/date";
import { displayCode } from "@/lib/trips/journey";

function fmtMoney(value: string, currency: string): string {
  const numeric = Number.parseFloat(value.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(numeric)) return `${currency} ${value}`;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(numeric);
}

export default async function TripsPage() {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const accessToken = session.apiAccessToken;
  const [user, items, pendingActions, activity] = await Promise.all([
    getCurrentUser(accessToken),
    getTrips(accessToken),
    getPendingActions(accessToken),
    getRecentActivity(accessToken),
  ]);
  if (!user) redirect("/login");
  const pending = pendingActions.map(toPendingItem);

  // Próxima viagem em destaque (#67): hero com countdown e preços já Escolhidos.
  const nextTrip = selectNextTrip(items, new Date().toISOString());
  const nextStart = nextTrip?.trip.start_date ?? null;
  const days = nextStart ? countdownDays(nextStart, new Date().toISOString()) : 0;
  const nextRoute = nextTrip
    ? [
        { key: "origin", code: nextTrip.trip.airport_code ?? displayCode(nextTrip.trip.origin) },
        ...nextTrip.stops.map((s) => ({
          key: s.id,
          code: s.airport_code ?? displayCode(s.city),
        })),
        { key: "return", code: nextTrip.trip.airport_code ?? displayCode(nextTrip.trip.origin) },
      ]
    : [];
  const chosenFares = nextTrip
    ? (
        await Promise.all(
          (
            await getLegs(accessToken, nextTrip.trip.id)
          ).map((leg) => getFares(accessToken, leg.id)),
        )
      )
        .flat()
        .filter((f) => f.is_chosen)
    : [];

  return (
    <AppShell user={user} counts={{ pending: pending.length }}>
      <main className="page fadeup">
        <div className="shell">
          <div className="section-head" style={{ marginBottom: 28 }}>
            <div>
              <div className="kicker" style={{ marginBottom: 8 }}>
                painel de viagens
              </div>
              <h1 className="display" style={{ fontSize: 38 }}>
                Suas viagens
              </h1>
            </div>
            <span className="spacer" />
            <Link className="btn accent" href="/trips/new">
              <Icon name="plus" size={14} /> Nova viagem
            </Link>
          </div>

          {nextTrip && (
            <Link
              href={`/trips/${nextTrip.trip.id}`}
              className="card"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                padding: "26px 28px",
                marginBottom: 24,
                textDecoration: "none",
                color: "inherit",
                gap: 20,
                borderLeft: "3px solid var(--accent)",
                alignItems: "start",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="kicker" style={{ color: "var(--accent)" }}>
                  próxima viagem
                </span>
                <h2 className="display" style={{ fontSize: 26, marginBottom: 2 }}>
                  {nextTrip.trip.name}
                </h2>
                {nextRoute.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {nextRoute.map((point, index) => (
                      <span
                        key={point.key}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                      >
                        {index > 0 && (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>→</span>
                        )}
                        <Code code={point.code} size="sm" />
                      </span>
                    ))}
                  </div>
                )}
                {chosenFares.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    {chosenFares.map((f) => (
                      <span
                        key={f.id}
                        className="chip green"
                        style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                      >
                        {f.origin_airport} → {f.destination_airport}{" "}
                        <strong>{fmtMoney(f.value, f.currency)}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  textAlign: "right",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                }}
              >
                <span
                  className="mono-num"
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: days === 0 ? "var(--accent)" : "var(--ink)",
                  }}
                >
                  {days === 0 ? "✈" : days}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}
                >
                  {days === 0 ? "é hoje!" : `dia${days !== 1 ? "s" : ""}`}
                </span>
              </div>
            </Link>
          )}

          {pending.length > 0 && (
            <div className="card flat" style={{ padding: "22px 24px", marginBottom: 26 }}>
              <div className="section-head" style={{ marginBottom: 14 }}>
                <span className="kicker">o que precisa de mim</span>
                <span className="spacer" style={{ flex: 1 }} />
                <span className="mono-num" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {pending.length} pendência{pending.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {pending.map((p) => (
                  <Link
                    key={`${p.kind}-${p.href}`}
                    href={p.href}
                    className="card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ color: "var(--accent)", display: "inline-flex" }}>
                      <Icon name="compass" size={16} />
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14.5 }}>{p.verb}</span>
                    <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                      {p.target}
                    </span>
                    <span className="spacer" style={{ flex: 1 }} />
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                      {p.tripName}
                    </span>
                    <Icon name="arrowRight" size={14} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {activity.length > 0 && (
            <div className="card flat" style={{ padding: "22px 24px", marginBottom: 26 }}>
              <div className="section-head" style={{ marginBottom: 14 }}>
                <span className="kicker">atividade recente</span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {activity.map((item) => (
                  <Link
                    key={item.id}
                    href={activityHref(item)}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span
                      className="chip outline"
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        flexShrink: 0,
                      }}
                    >
                      {activityKindLabel(item.kind)}
                    </span>
                    {item.actor_name && (
                      <span style={{ fontWeight: 600, fontSize: 13.5, flexShrink: 0 }}>
                        {item.actor_name}
                      </span>
                    )}
                    <span
                      className="soft"
                      style={{
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.body}
                    </span>
                    <span className="spacer" style={{ flex: 1 }} />
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}
                    >
                      {item.trip_name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="empty">
              <Icon name="pin" size={22} />
              <div style={{ fontWeight: 600, color: "var(--ink-soft)" }}>Nenhuma viagem ainda.</div>
              <Link className="btn small accent" href="/trips/new">
                <Icon name="plus" size={13} /> Criar a primeira
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {items.map(({ trip, membership, stops }) => {
                const codes = stops.length
                  ? stops.map((s) => s.airport_code ?? displayCode(s.city)).join(" · ")
                  : (trip.airport_code ?? displayCode(trip.origin));
                const route = [
                  { key: "origin", code: trip.airport_code ?? displayCode(trip.origin) },
                  ...stops.map((stop) => ({
                    key: stop.id,
                    code: stop.airport_code ?? displayCode(stop.city),
                  })),
                  { key: "return", code: trip.airport_code ?? displayCode(trip.origin) },
                ];
                return (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="card"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "180px 1fr",
                      overflow: "hidden",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <CoverGraphic seedText={trip.id} codeLabel={codes} height="100%" />
                    <div
                      style={{
                        padding: "22px 26px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 14,
                          flexWrap: "wrap",
                        }}
                      >
                        <h2 className="display" style={{ fontSize: 23 }}>
                          {trip.name}
                        </h2>
                        <span
                          className="mono-num"
                          style={{ fontSize: 12.5, color: "var(--muted)" }}
                        >
                          {formatDateRange(trip.start_date, trip.end_date)}
                        </span>
                        <span className="spacer" style={{ flex: 1 }} />
                        {membership.role === "organizer" && (
                          <span className="chip green">organizador</span>
                        )}
                      </div>
                      {trip.description && (
                        <p className="soft" style={{ fontSize: 14, maxWidth: 600 }}>
                          {trip.description}
                        </p>
                      )}
                      {stops.length ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                            marginTop: 2,
                          }}
                        >
                          {route.map((point, index) => (
                            <span
                              key={point.key}
                              style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
                            >
                              {index > 0 && (
                                <span style={{ color: "var(--muted)", fontSize: 12 }}>→</span>
                              )}
                              <Code code={point.code} size="sm" />
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="chip outline" style={{ alignSelf: "flex-start" }}>
                          sem paradas definidas
                        </span>
                      )}
                      <div style={{ marginTop: "auto", paddingTop: 6 }}>
                        <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                          {stops.length} parada{stops.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
