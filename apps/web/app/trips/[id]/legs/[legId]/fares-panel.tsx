"use client";

import type { FareQuotePublic, MembershipRole, UpvoteResponse } from "@traveltogether/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { chooseFare, createFare, deleteFare, getUpvote, toggleUpvote } from "@/lib/api/fares";

interface Props {
  legId: string;
  initialFares: FareQuotePublic[];
  role: MembershipRole;
  accessToken: string;
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

export default function FaresPanel({ legId, initialFares, role, accessToken }: Props) {
  const router = useRouter();
  const [fares, setFares] = useState<FareQuotePublic[]>(initialFares);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [upvotes, setUpvotes] = useState<Record<string, UpvoteResponse>>({});
  const isOrganizer = role === "organizer";

  useEffect(() => {
    async function loadUpvotes() {
      const results = await Promise.all(initialFares.map((f) => getUpvote(accessToken, f.id)));
      const map: Record<string, UpvoteResponse> = {};
      initialFares.forEach((f, i) => {
        const r = results[i];
        if (r) map[f.id] = r;
      });
      setUpvotes(map);
    }
    void loadUpvotes();
  }, [accessToken, initialFares]);

  async function handleUpvote(fareId: string) {
    const result = await toggleUpvote(accessToken, fareId);
    if (result) {
      setUpvotes((prev) => ({ ...prev, [fareId]: result }));
    }
  }

  function setField(key: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fare = await createFare(accessToken, legId, {
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
    await deleteFare(accessToken, legId, fareId);
    setFares((prev) => prev.filter((f) => f.id !== fareId));
    setLoading(false);
    router.refresh();
  }

  async function handleChoose(fareId: string) {
    const updated = await chooseFare(accessToken, legId, fareId);
    if (updated) {
      setFares((prev) => prev.map((f) => (f.id === fareId ? updated : { ...f, is_chosen: false })));
    }
  }

  return (
    <div className="fares-panel">
      {fares.length === 0 ? (
        <p className="trips-empty">Nenhuma pesquisa registrada.</p>
      ) : (
        <ul className="fares-list">
          {fares.map((fare) => (
            <li key={fare.id} className={fare.is_chosen ? "fare-item fare-chosen" : "fare-item"}>
              <div className="fare-header">
                <strong>{fare.airline}</strong>
                {fare.is_chosen && <span className="chosen-badge">Escolhida</span>}
                <span className="fare-value">
                  {fare.currency} {fare.value}
                </span>
              </div>
              <div className="fare-details">
                <span>
                  {fare.origin_airport} → {fare.destination_airport}
                </span>
                <span>{new Date(fare.flight_date).toLocaleDateString("pt-BR")}</span>
                <span>{fare.duration_minutes}min</span>
                <span>{fare.stops} escala(s)</span>
                {fare.checked_baggage && <span>Despacho incluso</span>}
              </div>
              {fare.notes && <p className="fare-notes">{fare.notes}</p>}
              <div className="fare-actions">
                <button
                  type="button"
                  onClick={() => handleUpvote(fare.id)}
                  className={upvotes[fare.id]?.voted ? "upvote-button voted" : "upvote-button"}
                >
                  ▲ {upvotes[fare.id]?.count ?? 0}
                </button>
                {isOrganizer && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleChoose(fare.id)}
                      disabled={loading}
                      className={fare.is_chosen ? "choose-button chosen" : "choose-button"}
                    >
                      {fare.is_chosen ? "Desmarcar" : "Escolher"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(fare.id)}
                      disabled={loading}
                      className="danger-button"
                    >
                      Remover
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOrganizer && (
        <>
          {!showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="primary-button">
              Registrar Pesquisa
            </button>
          )}
          {showForm && (
            <form onSubmit={handleAdd} className="fare-add-form">
              <div className="form-row">
                <input
                  value={form.airline}
                  onChange={(e) => setField("airline", e.target.value)}
                  placeholder="Companhia"
                  required
                  className="fare-input"
                />
                <input
                  value={form.value}
                  onChange={(e) => setField("value", e.target.value)}
                  placeholder="Valor (ex: 1500.00)"
                  required
                  className="fare-input"
                />
                <input
                  value={form.currency}
                  onChange={(e) => setField("currency", e.target.value)}
                  placeholder="Moeda"
                  required
                  className="fare-input fare-input-sm"
                />
              </div>
              <div className="form-row">
                <input
                  value={form.origin_airport}
                  onChange={(e) => setField("origin_airport", e.target.value)}
                  placeholder="Aeroporto origem (ex: GRU)"
                  required
                  className="fare-input fare-input-sm"
                />
                <input
                  value={form.destination_airport}
                  onChange={(e) => setField("destination_airport", e.target.value)}
                  placeholder="Aeroporto destino (ex: EZE)"
                  required
                  className="fare-input fare-input-sm"
                />
              </div>
              <div className="form-row">
                <input
                  type="date"
                  value={form.flight_date}
                  onChange={(e) => setField("flight_date", e.target.value)}
                  required
                  className="fare-input"
                />
                <input
                  value={form.duration_minutes}
                  onChange={(e) => setField("duration_minutes", e.target.value)}
                  placeholder="Duração (min)"
                  required
                  className="fare-input fare-input-sm"
                />
                <input
                  value={form.stops}
                  onChange={(e) => setField("stops", e.target.value)}
                  placeholder="Escalas"
                  className="fare-input fare-input-sm"
                />
              </div>
              <div className="form-row">
                <label className="fare-checkbox">
                  <input
                    type="checkbox"
                    checked={form.checked_baggage}
                    onChange={(e) => setField("checked_baggage", e.target.checked)}
                  />
                  Bagagem despachada
                </label>
              </div>
              <div className="form-row">
                <input
                  value={form.link}
                  onChange={(e) => setField("link", e.target.value)}
                  placeholder="Link (opcional)"
                  className="fare-input"
                />
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Observações"
                className="fare-input"
              />
              <div className="form-actions">
                <button type="submit" disabled={loading} className="primary-button">
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="secondary-button"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
