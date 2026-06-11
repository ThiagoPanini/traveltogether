"use client";

import type { FareQuotePublic, MembershipRole, UpvoteResponse } from "@traveltogether/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  chooseFareAction,
  createFareAction,
  deleteFareAction,
  getUpvoteAction,
  toggleUpvoteAction,
} from "./actions";

interface Props {
  legId: string;
  tripId: string;
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
    day: "2-digit",
    month: "short",
    year: "numeric",
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
  initialFares,
  role,
  fromCode,
  toCode,
  fromCity,
  toCity,
}: Props) {
  const router = useRouter();
  const [fares, setFares] = useState<FareQuotePublic[]>(initialFares);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<"tickets" | "compare">("tickets");
  const [upvotes, setUpvotes] = useState<Record<string, UpvoteResponse>>({});

  const isOrganizer = role === "organizer";

  useEffect(() => {
    async function loadUpvotes() {
      const results = await Promise.all(initialFares.map((f) => getUpvoteAction(f.id)));
      const map: Record<string, UpvoteResponse> = {};
      initialFares.forEach((f, i) => {
        const r = results[i];
        if (r) map[f.id] = r;
      });
      setUpvotes(map);
    }
    void loadUpvotes();
  }, [initialFares]);

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
        return chosenDelta || moneyValue(a) - moneyValue(b);
      }),
    [fares],
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
      origin_airport: form.origin_airport,
      destination_airport: form.destination_airport,
      airline: form.airline,
      link: form.link,
      notes: form.notes,
    });
    if (fare) {
      setFares((prev) => [...prev, fare]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(fareId: string) {
    setLoading(true);
    await deleteFareAction(legId, fareId);
    setFares((prev) => prev.filter((f) => f.id !== fareId));
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="fares-panel">
      <div className="fare-head">
        <div>
          <p className="eyebrow">pesquisa de passagem · trajeto</p>
          <div className="fare-route-big">
            {fromCode}
            <span className="ar">✈</span>
            {toCode}
          </div>
          <p className="fare-route-city">
            {fromCity} para {toCity}
          </p>
        </div>
        {fares.length > 0 && (
          <div className="cmp-toggle">
            <button
              className={view === "tickets" ? "on" : ""}
              onClick={() => setView("tickets")}
              type="button"
            >
              Bilhetes
            </button>
            <button
              className={view === "compare" ? "on" : ""}
              onClick={() => setView("compare")}
              type="button"
            >
              Comparar
            </button>
          </div>
        )}
      </div>

      {fares.length === 0 ? (
        <div className="fares-empty">
          <p className="empty">
            Nenhuma pesquisa registrada para este trajeto.
            {isOrganizer ? " Adicione a primeira pesquisa abaixo." : ""}
          </p>
          <Link href={`/trips/${tripId}`} className="secondary-button btn-sm">
            ← Voltar à Viagem
          </Link>
        </div>
      ) : view === "tickets" ? (
        <ul className="ticket-list">
          {orderedFares.map((fare) => {
            const cheapest = fare.id === cheapestId;
            const chosen = fare.is_chosen;
            const vote = voteFor(fare.id);
            return (
              <li key={fare.id} className={chosen ? "bp ticket chosen" : "bp ticket"}>
                <div className="ticket-main">
                  <div className="tk-head">
                    <strong className="tk-airline">
                      {fare.airline}
                      {chosen && <span className="tk-chosen">★ escolhida</span>}
                      {cheapest && !chosen && <span className="tk-cheapest">menor preço</span>}
                    </strong>
                    <button
                      className={vote.voted ? "upvote on" : "upvote"}
                      onClick={() => handleUpvote(fare.id)}
                      type="button"
                    >
                      ↑ {vote.count}
                    </button>
                  </div>
                  <div className="tk-body">
                    <div className="tk-field">
                      <div className="k">rota</div>
                      <div className="v">
                        {fare.origin_airport} → {fare.destination_airport}
                      </div>
                    </div>
                    <div className="tk-field">
                      <div className="k">data</div>
                      <div className="v">{formatDate(fare.flight_date)}</div>
                    </div>
                    <div className="tk-field">
                      <div className="k">duração</div>
                      <div className="v">{formatDuration(fare.duration_minutes)}</div>
                    </div>
                    <div className="tk-field">
                      <div className="k">escalas</div>
                      <div className="v">{fare.stops === 0 ? "direto" : fare.stops}</div>
                    </div>
                    <div className="tk-field">
                      <div className="k">bagagem</div>
                      <div className="v">{fare.checked_baggage ? "incluída" : "—"}</div>
                    </div>
                  </div>
                  {fare.notes && <p className="tk-notes">{fare.notes}</p>}
                  <div className="ticket-actions">
                    {isOrganizer && (
                      <button
                        className="secondary-button btn-sm"
                        onClick={() => handleChoose(fare.id)}
                        type="button"
                        disabled={loading}
                      >
                        {chosen ? "Desmarcar escolhida" : "Marcar como escolhida"}
                      </button>
                    )}
                    {fare.link && (
                      <a
                        className="secondary-button btn-sm"
                        href={fare.link}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Abrir link
                      </a>
                    )}
                    {isOrganizer && (
                      <button
                        className="danger-button btn-sm"
                        disabled={loading}
                        onClick={() => handleDelete(fare.id)}
                        type="button"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                <div className="perf-v" />
                <div className="tk-stub">
                  <span className="currency">{fare.currency}</span>
                  <span className="price">{formatMoney(fare).replace(/^R\$\s?/, "")}</span>
                  <span className="by">
                    {new Date(fare.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="cmp-table">
          <table className="cmp">
            <thead>
              <tr>
                <th>Companhia</th>
                <th>Preço</th>
                <th>Rota</th>
                <th>Data</th>
                <th>Duração</th>
                <th>Escalas</th>
                <th>Bagagem</th>
                <th>Votos</th>
              </tr>
            </thead>
            <tbody>
              {sortedFares.map((fare) => {
                const chosen = fare.is_chosen;
                return (
                  <tr key={fare.id} className={chosen ? "chosen" : ""}>
                    <td className="airline">
                      {chosen && <span style={{ color: "var(--gold)" }}>★ </span>}
                      {fare.airline}
                    </td>
                    <td className={fare.id === cheapestId ? "price best" : "price"}>
                      {formatMoney(fare)}
                    </td>
                    <td>
                      {fare.origin_airport} → {fare.destination_airport}
                    </td>
                    <td>{formatDate(fare.flight_date)}</td>
                    <td>{formatDuration(fare.duration_minutes)}</td>
                    <td>{fare.stops === 0 ? "direto" : fare.stops}</td>
                    <td>{fare.checked_baggage ? "sim" : "—"}</td>
                    <td>↑ {voteFor(fare.id).count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isOrganizer && (
        <>
          {!showForm && (
            <button className="secondary-button" onClick={() => setShowForm(true)} type="button">
              + Registrar pesquisa
            </button>
          )}
          {showForm && (
            <form className="bp fare-form-ticket" onSubmit={handleAdd}>
              <div className="bp-head">
                <span>Nova Pesquisa</span>
                <span className="flight">Fare quote</span>
              </div>
              <div className="form-card">
                <div className="form-row">
                  <label className="field">
                    <span>Companhia</span>
                    <input
                      className="fare-input"
                      onChange={(e) => setField("airline", e.target.value)}
                      placeholder="TAP Air Portugal"
                      required
                      value={form.airline}
                    />
                  </label>
                  <label className="field">
                    <span>Valor</span>
                    <input
                      className="fare-input"
                      onChange={(e) => setField("value", e.target.value)}
                      placeholder="3420.00"
                      required
                      value={form.value}
                    />
                  </label>
                  <label className="field">
                    <span>Moeda</span>
                    <input
                      className="fare-input fare-input-sm"
                      onChange={(e) => setField("currency", e.target.value)}
                      placeholder="BRL"
                      required
                      value={form.currency}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Aeroporto origem</span>
                    <input
                      className="fare-input fare-input-sm"
                      onChange={(e) => setField("origin_airport", e.target.value)}
                      placeholder="GRU"
                      required
                      value={form.origin_airport}
                    />
                  </label>
                  <label className="field">
                    <span>Aeroporto destino</span>
                    <input
                      className="fare-input fare-input-sm"
                      onChange={(e) => setField("destination_airport", e.target.value)}
                      placeholder="LIS"
                      required
                      value={form.destination_airport}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Data da passagem</span>
                    <input
                      className="fare-input"
                      onChange={(e) => setField("flight_date", e.target.value)}
                      required
                      type="date"
                      value={form.flight_date}
                    />
                  </label>
                  <label className="field">
                    <span>Duração (min)</span>
                    <input
                      className="fare-input fare-input-sm"
                      onChange={(e) => setField("duration_minutes", e.target.value)}
                      placeholder="635"
                      required
                      value={form.duration_minutes}
                    />
                  </label>
                  <label className="field">
                    <span>Escalas</span>
                    <input
                      className="fare-input fare-input-sm"
                      onChange={(e) => setField("stops", e.target.value)}
                      placeholder="0"
                      value={form.stops}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="fare-checkbox">
                    <input
                      checked={form.checked_baggage}
                      onChange={(e) => setField("checked_baggage", e.target.checked)}
                      type="checkbox"
                    />
                    Bagagem despachada
                  </label>
                </div>
                <label className="field">
                  <span>Link</span>
                  <input
                    className="fare-input"
                    onChange={(e) => setField("link", e.target.value)}
                    placeholder="Link (opcional)"
                    value={form.link}
                  />
                </label>
                <label className="field">
                  <span>Observações</span>
                  <textarea
                    className="fare-input"
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Voo direto, noturno…"
                    value={form.notes}
                  />
                </label>
                <div className="form-actions">
                  <button className="primary-button" disabled={loading} type="submit">
                    Salvar
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => setShowForm(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
