"use client";

import type { FareQuotePublic, MembershipRole, UpvoteResponse } from "@traveltogether/types";
import { useMemo, useState } from "react";

import { Code, Icon, UserAvatar } from "@/components/atlas";
import {
  chooseFareAction,
  createFareAction,
  deleteFareAction,
  toggleUpvoteAction,
} from "./actions";
import CommentThread from "./comment-thread";

interface Props {
  legId: string;
  tripId: string;
  currentUserId: string;
  initialFares: FareQuotePublic[];
  role: MembershipRole;
  fromCode: string;
  toCode: string;
  fromCity: string;
  toCity: string;
}

const EMPTY_FORM = {
  value: "",
  currency: "BRL",
  flight_date: "",
  duration_minutes: "",
  stops: "0",
  checked_baggage: false,
  origin_airport: "",
  destination_airport: "",
  airline: "",
  link: "",
  notes: "",
};

function moneyValue(fare: FareQuotePublic): number {
  const raw = String(fare.value).trim();
  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function formatMoney(fare: FareQuotePublic): string {
  const numeric = moneyValue(fare);
  if (!Number.isFinite(numeric)) return `${fare.currency} ${fare.value}`;
  return new Intl.NumberFormat("pt-BR", {
    currency: fare.currency || "BRL",
    style: "currency",
  }).format(numeric);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours}h`;
}

export default function FaresPanel({
  legId,
  tripId,
  currentUserId,
  initialFares,
  role,
  fromCode,
  toCode,
  fromCity,
  toCity,
}: Props) {
  const [fares, setFares] = useState<FareQuotePublic[]>(initialFares);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<"tickets" | "compare">("tickets");
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [upvotes, setUpvotes] = useState<Record<string, UpvoteResponse>>(() =>
    Object.fromEntries(
      initialFares.map((f) => [f.id, { count: f.upvote_count, voted: f.user_voted }]),
    ),
  );

  const isOrganizer = role === "organizer";

  async function handleUpvote(fareId: string) {
    const result = await toggleUpvoteAction(fareId);
    if (result) setUpvotes((prev) => ({ ...prev, [fareId]: result }));
  }

  async function handleChoose(fareId: string) {
    setLoading(true);
    const updated = await chooseFareAction(legId, fareId);
    if (updated) {
      setFares((prev) =>
        prev.map((f) => ({ ...f, is_chosen: f.id === fareId ? !f.is_chosen : false })),
      );
    }
    setLoading(false);
  }

  const voteFor = (fareId: string): UpvoteResponse => upvotes[fareId] ?? { count: 0, voted: false };

  const cheapestId = useMemo(
    () =>
      fares.reduce<FareQuotePublic | null>(
        (cheapest, fare) =>
          !cheapest || moneyValue(fare) < moneyValue(cheapest) ? fare : cheapest,
        null,
      )?.id ?? null,
    [fares],
  );

  const orderedFares = useMemo(
    () =>
      [...fares].sort((a, b) => {
        const chosenDelta = (b.is_chosen ? 1 : 0) - (a.is_chosen ? 1 : 0);
        if (chosenDelta) return chosenDelta;
        const countFor = (id: string) => upvotes[id]?.count ?? 0;
        return countFor(b.id) - countFor(a.id);
      }),
    [fares, upvotes],
  );

  const sortedFares = useMemo(
    () => [...fares].sort((a, b) => moneyValue(a) - moneyValue(b)),
    [fares],
  );

  function setField(key: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fare = await createFareAction(legId, {
      value: form.value,
      currency: form.currency,
      flight_date: `${form.flight_date}T00:00:00`,
      duration_minutes: Number(form.duration_minutes),
      stops: Number(form.stops),
      checked_baggage: form.checked_baggage,
      origin_airport: form.origin_airport.toUpperCase(),
      destination_airport: form.destination_airport.toUpperCase(),
      airline: form.airline,
      link: form.link,
      notes: form.notes,
    });
    if (fare) {
      setFares((prev) => [...prev, fare]);
      setUpvotes((prev) => ({
        ...prev,
        [fare.id]: { count: fare.upvote_count, voted: fare.user_voted },
      }));
      setForm(EMPTY_FORM);
      setShowForm(false);
    }
    setLoading(false);
  }

  async function handleDelete(fareId: string) {
    setLoading(true);
    await deleteFareAction(legId, fareId);
    setFares((prev) => prev.filter((f) => f.id !== fareId));
    setLoading(false);
  }

  const minPrice = Math.min(...fares.map(moneyValue));
  const minDur = Math.min(...fares.map((f) => f.duration_minutes));
  const compareRows: {
    label: string;
    render: (f: FareQuotePublic) => React.ReactNode;
    best?: (f: FareQuotePublic) => boolean;
  }[] = [
    {
      label: "Preço",
      render: (f) => (
        <strong className="mono-num" style={{ fontSize: 16 }}>
          {formatMoney(f)}
        </strong>
      ),
      best: (f) => moneyValue(f) === minPrice,
    },
    { label: "Data do voo", render: (f) => formatDate(f.flight_date) },
    {
      label: "Duração",
      render: (f) => formatDuration(f.duration_minutes),
      best: (f) => f.duration_minutes === minDur,
    },
    {
      label: "Escalas",
      render: (f) => (f.stops === 0 ? "Direto" : `${f.stops} escala${f.stops > 1 ? "s" : ""}`),
      best: (f) => f.stops === 0,
    },
    {
      label: "Bagagem",
      render: (f) => (f.checked_baggage ? "Inclusa" : "Não inclusa"),
      best: (f) => f.checked_baggage,
    },
    {
      label: "Aeroportos",
      render: (f) => (
        <span className="mono-num">
          {f.origin_airport} → {f.destination_airport}
        </span>
      ),
    },
    { label: "Upvotes", render: (f) => <span className="mono-num">▲ {voteFor(f.id).count}</span> },
  ];

  return (
    <div>
      {/* leg header */}
      <div className="card" style={{ padding: "22px 26px", marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Code code={fromCode} size="lg" />
            <span style={{ color: "var(--accent)" }}>
              <Icon name="arrowRight" size={22} />
            </span>
            <Code code={toCode} size="lg" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>
              {fromCity} → {toCity}
            </div>
            <div className="mono-num" style={{ fontSize: 12.5, color: "var(--muted)" }}>
              pesquisa de passagem · trajeto
            </div>
          </div>
          <span className="spacer" style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 10 }}>
            {fares.length >= 2 && (
              <button
                className="btn ghost small"
                onClick={() => setView((v) => (v === "tickets" ? "compare" : "tickets"))}
                type="button"
              >
                {view === "tickets" ? "Comparar lado a lado" : "Ver lista"}
              </button>
            )}
            {isOrganizer && (
              <button
                className="btn accent small"
                onClick={() => setShowForm((v) => !v)}
                type="button"
              >
                <Icon name="plus" size={13} /> Registrar pesquisa
              </button>
            )}
          </div>
        </div>
      </div>

      {showForm && isOrganizer && (
        <form
          className="card flat"
          onSubmit={handleAdd}
          style={{ border: "1.5px dashed var(--line)", padding: "20px 22px", marginBottom: 22 }}
        >
          <div className="kicker" style={{ marginBottom: 16 }}>
            nova pesquisa de passagem
          </div>
          <div className="form-grid">
            <div className="form-row cols-3">
              <label className="field">
                <span>Companhia</span>
                <input
                  onChange={(e) => setField("airline", e.target.value)}
                  placeholder="TAP Air Portugal"
                  required
                  value={form.airline}
                />
              </label>
              <label className="field">
                <span>Valor</span>
                <input
                  onChange={(e) => setField("value", e.target.value)}
                  placeholder="4280"
                  required
                  value={form.value}
                />
              </label>
              <label className="field">
                <span>Moeda</span>
                <select
                  onChange={(e) => setField("currency", e.target.value)}
                  value={form.currency}
                >
                  {["BRL", "EUR", "USD", "GBP", "ARS", "JPY"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row cols-4">
              <label className="field">
                <span>Data do voo</span>
                <input
                  onChange={(e) => setField("flight_date", e.target.value)}
                  required
                  type="date"
                  value={form.flight_date}
                />
              </label>
              <label className="field">
                <span>Duração (min)</span>
                <input
                  onChange={(e) => setField("duration_minutes", e.target.value)}
                  placeholder="635"
                  required
                  value={form.duration_minutes}
                />
              </label>
              <label className="field">
                <span>Escalas</span>
                <select onChange={(e) => setField("stops", e.target.value)} value={form.stops}>
                  <option value="0">Direto</option>
                  <option value="1">1 escala</option>
                  <option value="2">2 escalas</option>
                  <option value="3">3+</option>
                </select>
              </label>
              <label className="field">
                <span>Bagagem</span>
                <select
                  onChange={(e) => setField("checked_baggage", e.target.value === "1")}
                  value={form.checked_baggage ? "1" : "0"}
                >
                  <option value="0">Não inclusa</option>
                  <option value="1">Inclusa</option>
                </select>
              </label>
            </div>
            <div className="form-row cols-2">
              <label className="field">
                <span>Aeroportos pesquisados</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    maxLength={3}
                    onChange={(e) => setField("origin_airport", e.target.value)}
                    placeholder="GRU"
                    required
                    style={{
                      textTransform: "uppercase",
                      fontFamily: "var(--font-mono)",
                      width: 80,
                    }}
                    value={form.origin_airport}
                  />
                  <Icon name="arrowRight" size={13} />
                  <input
                    maxLength={3}
                    onChange={(e) => setField("destination_airport", e.target.value)}
                    placeholder="LIS"
                    required
                    style={{
                      textTransform: "uppercase",
                      fontFamily: "var(--font-mono)",
                      width: 80,
                    }}
                    value={form.destination_airport}
                  />
                </div>
              </label>
              <label className="field">
                <span>Link (opcional)</span>
                <input
                  onChange={(e) => setField("link", e.target.value)}
                  placeholder="https://…"
                  value={form.link}
                />
              </label>
            </div>
            <label className="field">
              <span>Observações (opcional)</span>
              <input
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Conexão curta em MAD, preço por pessoa…"
                value={form.notes}
              />
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 18 }}>
            <button className="btn small ghost" onClick={() => setShowForm(false)} type="button">
              Cancelar
            </button>
            <button className="btn small accent" disabled={loading} type="submit">
              Registrar pesquisa
            </button>
          </div>
        </form>
      )}

      <div className="section-head">
        <span className="kicker">pesquisas de passagem</span>
        <h2>
          {fares.length
            ? `${fares.length} registrada${fares.length > 1 ? "s" : ""}`
            : "Nenhuma ainda"}
        </h2>
        <span className="spacer" />
        {fares.length > 0 && view === "tickets" && (
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
            ordenado por escolhida · upvotes
          </span>
        )}
        {fares.length > 0 && view === "compare" && (
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
            sem conversão de câmbio — comparação visual
          </span>
        )}
      </div>

      {fares.length === 0 ? (
        <div className="empty">
          <Icon name="plane" size={22} />
          <div style={{ fontWeight: 600, color: "var(--ink-soft)" }}>
            Nenhuma pesquisa neste trajeto.
          </div>
          <div style={{ fontSize: 13.5, maxWidth: 420 }}>
            Encontrou um voo bom em qualquer buscador? Registre aqui para o grupo comparar — preço,
            duração, escalas e bagagem.
          </div>
          {isOrganizer && (
            <button className="btn small accent" onClick={() => setShowForm(true)} type="button">
              <Icon name="plus" size={13} /> Registrar a primeira
            </button>
          )}
        </div>
      ) : view === "tickets" ? (
        <div className="card">
          <div className="board">
            {orderedFares.map((fare) => {
              const cheapest = fare.id === cheapestId;
              const chosen = fare.is_chosen;
              const vote = voteFor(fare.id);
              const threadOpen = openThread === fare.id;
              return (
                <div key={fare.id}>
                  <div
                    className="board-row"
                    style={{
                      gridTemplateColumns:
                        "minmax(150px, 1.3fr) minmax(110px, 1fr) minmax(150px, 1.3fr) auto auto auto",
                      background: chosen
                        ? "color-mix(in oklab, var(--accent) 7%, transparent)"
                        : undefined,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 650,
                          fontSize: 15,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {fare.airline}
                        {chosen && <span className="stamp">escolhida</span>}
                        {!chosen && cheapest && <span className="chip outline">menor preço</span>}
                      </div>
                      <div
                        className="mono-num"
                        style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}
                      >
                        {formatDate(fare.flight_date)} · {fare.origin_airport} →{" "}
                        {fare.destination_airport}
                      </div>
                    </div>
                    <div
                      className="mono-num"
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-soft)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Icon name="clock" size={11} /> {formatDuration(fare.duration_minutes)}
                      </span>
                      <span>
                        {fare.stops === 0
                          ? "direto"
                          : `${fare.stops} escala${fare.stops > 1 ? "s" : ""}`}{" "}
                        · {fare.checked_baggage ? "c/ bagagem" : "s/ bagagem"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", overflow: "hidden" }}>
                      {fare.notes && (
                        <div
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textWrap: "pretty",
                          }}
                        >
                          {fare.notes}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 6,
                        }}
                      >
                        <UserAvatar
                          avatarUrl={fare.registered_by_avatar_url}
                          label={fare.registered_by_display_name ?? "Membro"}
                          seed={fare.registered_by}
                          size={18}
                        />
                        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted)" }}>
                          {fare.registered_by_display_name ?? "Membro"} ·{" "}
                          {new Date(fare.created_at).toLocaleDateString("pt-BR")}
                          {fare.link && (
                            <>
                              {" · "}
                              <a
                                href={fare.link}
                                rel="noreferrer"
                                style={{ color: "var(--accent)" }}
                                target="_blank"
                              >
                                link ↗
                              </a>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <div
                      className="mono-num"
                      style={{
                        fontWeight: 700,
                        fontSize: 19,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMoney(fare)}
                    </div>
                    <button
                      className={`upvote ${vote.voted ? "on" : ""}`}
                      onClick={() => handleUpvote(fare.id)}
                      type="button"
                    >
                      <Icon name="up" size={12} /> {vote.count}
                    </button>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className={`btn tiny ghost ${threadOpen ? "on" : ""}`}
                        onClick={() => setOpenThread(threadOpen ? null : fare.id)}
                        title="Comentários"
                        type="button"
                      >
                        <Icon name="message" size={13} />
                      </button>
                      {isOrganizer && (
                        <button
                          className="btn tiny ghost"
                          disabled={loading}
                          onClick={() => handleChoose(fare.id)}
                          type="button"
                        >
                          {chosen ? "Desmarcar" : "Escolher"}
                        </button>
                      )}
                      {isOrganizer && (
                        <button
                          className="icon-btn"
                          disabled={loading}
                          onClick={() => handleDelete(fare.id)}
                          title="Excluir pesquisa"
                          type="button"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  {threadOpen && (
                    <div style={{ padding: "0 18px 16px" }}>
                      <CommentThread
                        tripId={tripId}
                        targetType="fare_quote"
                        targetId={fare.id}
                        currentUserId={currentUserId}
                        role={role}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ width: 150 }} />
                {sortedFares.map((f) => (
                  <th key={f.id} className={f.is_chosen ? "col-chosen" : undefined}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{f.airline}</div>
                    {f.is_chosen ? (
                      <span className="stamp" style={{ marginTop: 8 }}>
                        escolhida
                      </span>
                    ) : (
                      isOrganizer && (
                        <button
                          className="btn tiny ghost"
                          onClick={() => handleChoose(f.id)}
                          style={{ marginTop: 8 }}
                          type="button"
                        >
                          Escolher esta
                        </button>
                      )
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.label}>
                  <td className="row-label">{row.label}</td>
                  {sortedFares.map((f) => {
                    const isBest = row.best?.(f);
                    return (
                      <td
                        key={f.id}
                        className={`${f.is_chosen ? "col-chosen" : ""} ${isBest ? "is-best" : ""}`.trim()}
                      >
                        {row.render(f)} {isBest && <span title="Melhor neste critério">●</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
