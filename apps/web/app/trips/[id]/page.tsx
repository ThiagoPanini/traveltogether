import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppTopbar } from "@/app/app-topbar";
import { getAuthSession } from "@/auth";
import { Breadcrumbs, CoverGraphic, Icon, RouteLine, type RoutePoint } from "@/components/atlas";
import CommentThread from "@/components/comment-thread";
import { getCurrentUser } from "@/lib/api/current-user";
import { getFares } from "@/lib/api/fares";
import { getTasks } from "@/lib/api/tasks";
import { getItineraryItems, getLegs, getStops, getTrip, getTripMembers } from "@/lib/api/trips";
import { computeBudget } from "@/lib/dashboard/budget";
import { formatDayMonth as fmtDay, formatDateRange } from "@/lib/format/date";
import { buildJourneySegments, displayCode } from "@/lib/trips/journey";
import { buildSchedule } from "@/lib/trips/schedule";
import TaskBoard from "./task-board";
import TripSequenceView from "./trip-sequence-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: Props) {
  const session = await getAuthSession();
  if (!session?.apiAccessToken) redirect("/login");

  const { id } = await params;
  const [data, stops, legs, members, currentUser, tasks] = await Promise.all([
    getTrip(session.apiAccessToken, id),
    getStops(session.apiAccessToken, id),
    getLegs(session.apiAccessToken, id),
    getTripMembers(session.apiAccessToken, id),
    getCurrentUser(session.apiAccessToken),
    getTasks(session.apiAccessToken, id),
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
      const chosenFare = fares.find((f) => f.is_chosen) ?? null;
      const chosen = chosenFare !== null;
      const best = fares.reduce<{ value: string; currency: string } | null>(
        (acc, f) => (!acc || moneyValue(f.value) < moneyValue(acc.value) ? f : acc),
        null,
      );
      return [leg.id, { count: fares.length, chosen, chosenFare, best }] as const;
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

  const itemsByStop = Object.fromEntries(
    await Promise.all(
      stops.map(
        async (stop) => [stop.id, await getItineraryItems(accessToken, id, stop.id)] as const,
      ),
    ),
  );

  const { trip, membership } = data;
  const activeMembers = members?.members ?? [];
  const chosenFaresByLeg = Object.fromEntries(
    legFareEntries.map(([id, info]) => [id, info.chosenFare]),
  );
  const budget = computeBudget(legs, chosenFaresByLeg, activeMembers.length);
  const scheduleBlocks = buildSchedule(trip.origin, stops, legs, itemsByStop);
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

          {/* orçamento do grupo (#62) */}
          {legs.length > 0 && (
            <>
              <div className="section-head" style={{ marginTop: 36 }}>
                <span className="kicker">orçamento</span>
                <h2>Custo estimado por pessoa</h2>
              </div>
              <div className="card flat" style={{ padding: "22px 26px", marginBottom: 36 }}>
                <div style={{ display: "grid", gap: 14 }}>
                  {budget.legs.map((item) => (
                    <div
                      key={item.legId}
                      style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}
                    >
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "var(--muted)", minWidth: 60 }}
                      >
                        trajeto {item.order + 1}
                      </span>
                      {item.chosen ? (
                        <>
                          <span
                            className="mono-num"
                            style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}
                          >
                            {fmtMoney(item.chosen.value, item.chosen.currency)}
                          </span>
                          <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                            {item.chosen.origin_airport} → {item.chosen.destination_airport}
                          </span>
                          <span className="chip green" style={{ fontSize: 11 }}>
                            {item.chosen.airline}
                          </span>
                        </>
                      ) : (
                        <span className="chip outline" style={{ fontSize: 11 }}>
                          a decidir
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {Object.keys(budget.totalByCurrency).length > 0 && (
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 16,
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      gap: 32,
                      flexWrap: "wrap",
                      alignItems: "flex-end",
                    }}
                  >
                    {Object.entries(budget.perPersonByCurrency).map(([currency, amount]) => (
                      <div
                        key={currency}
                        style={{ display: "flex", flexDirection: "column", gap: 2 }}
                      >
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          por pessoa · {currency}
                        </span>
                        <span
                          className="mono-num"
                          style={{
                            fontSize: 36,
                            fontWeight: 700,
                            lineHeight: 1,
                            color: "var(--accent)",
                          }}
                        >
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency,
                          }).format(amount)}
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                          {activeMembers.length} pessoa{activeMembers.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                    {budget.hasMixedCurrencies && (
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}
                      >
                        sem conversão de câmbio
                      </span>
                    )}
                  </div>
                )}

                {budget.hasUndecided && Object.keys(budget.totalByCurrency).length === 0 && (
                  <div className="empty" style={{ padding: "20px 0 4px" }}>
                    <Icon name="compass" size={18} />
                    <span style={{ fontSize: 13.5 }}>
                      Nenhum trajeto tem passagem escolhida ainda.
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* cronograma unificado (#63) */}
          {scheduleBlocks.length > 0 && (
            <>
              <div className="section-head" style={{ marginTop: 36 }}>
                <span className="kicker">cronograma</span>
                <h2>O que acontece quando</h2>
              </div>
              <div
                className="card flat"
                style={{ padding: "22px 26px", marginBottom: 36, position: "relative" }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 38,
                    top: 28,
                    bottom: 28,
                    width: 1,
                    background: "var(--border)",
                  }}
                  aria-hidden="true"
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {scheduleBlocks.map((block, idx) => {
                    if (block.kind === "leg") {
                      return (
                        <div
                          key={block.legId ?? `leg-${idx}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            paddingLeft: 58,
                            paddingTop: 10,
                            paddingBottom: 10,
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              left: 28,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "var(--accent)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon name="plane" size={11} />
                          </span>
                          <span
                            className="mono"
                            style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}
                          >
                            {block.fromCity} → {block.toCity}
                          </span>
                          {block.date && (
                            <span
                              className="mono-num"
                              style={{ fontSize: 11, color: "var(--muted)" }}
                            >
                              {fmtDay(block.date)}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // stay block
                    return (
                      <div
                        key={`stay-${block.stop.id}`}
                        style={{ paddingLeft: 58, paddingTop: 8, paddingBottom: 8 }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: 24,
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "var(--surface-raised)",
                            border: "2px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon name="pin" size={13} />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                          {block.stop.city}
                          {block.stop.airport_code && (
                            <span
                              className="mono"
                              style={{
                                fontSize: 11,
                                color: "var(--muted)",
                                marginLeft: 8,
                                fontWeight: 400,
                              }}
                            >
                              {block.stop.airport_code}
                            </span>
                          )}
                        </div>
                        {(block.stop.arrival_date || block.stop.departure_date) && (
                          <div
                            className="mono-num"
                            style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}
                          >
                            {fmtDay(block.stop.arrival_date)} – {fmtDay(block.stop.departure_date)}
                          </div>
                        )}
                        {block.scheduledItems.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            {block.scheduledItems.map((item) => (
                              <div
                                key={item.id}
                                style={{ display: "flex", alignItems: "baseline", gap: 10 }}
                              >
                                <span
                                  className="mono-num"
                                  style={{ fontSize: 11, color: "var(--muted)", minWidth: 80 }}
                                >
                                  {item.day ? fmtDay(item.day) : ""}
                                  {item.time ? ` ${item.time}` : ""}
                                </span>
                                <span style={{ fontSize: 13.5 }}>{item.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {block.unscheduledItems.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <span
                              className="mono"
                              style={{
                                fontSize: 10,
                                color: "var(--muted)",
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              sem data definida
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {block.unscheduledItems.map((item) => (
                                <span
                                  key={item.id}
                                  className="chip outline"
                                  style={{ fontSize: 12 }}
                                >
                                  {item.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
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

          {/* board kanban de Tarefas */}
          <TaskBoard
            tripId={id}
            currentUserId={currentUser?.id ?? ""}
            role={membership.role}
            initialTasks={tasks}
            members={activeMembers.map((m) => ({
              user_id: m.membership.user_id,
              display_name: m.display_name,
              avatar_url: m.avatar_url,
            }))}
            stops={stops}
          />
        </div>
      </main>
    </div>
  );
}
