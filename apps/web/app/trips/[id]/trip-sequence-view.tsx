"use client";

import type { LegPublic, MembershipRole, StopPublic } from "@traveltogether/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { buildJourneySegments, displayCode } from "@/lib/trips/journey";
import {
  createStopAction,
  deleteStopAction,
  reorderStopsAction,
  updateStopAction,
  updateStopCoverImageAction,
} from "./actions";

interface Props {
  tripId: string;
  origin: string;
  initialStops: StopPublic[];
  initialLegs: LegPublic[];
  fareCounts: Record<string, number>;
  role: MembershipRole;
}

function coverTone(value: string, index: number): number {
  return ([...value].reduce((sum, char) => sum + char.charCodeAt(0), index) + index) % 5;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function nightsBetween(arrival: string | null, departure: string | null): number | null {
  if (!arrival || !departure) return null;
  const ms =
    new Date(`${departure}T00:00:00`).getTime() - new Date(`${arrival}T00:00:00`).getTime();
  const nights = Math.round(ms / 86_400_000);
  return nights > 0 ? nights : null;
}

export default function TripSequenceView({
  tripId,
  origin,
  initialStops,
  initialLegs,
  fareCounts,
  role,
}: Props) {
  const router = useRouter();
  const [stops, setStops] = useState<StopPublic[]>(initialStops);
  const [newCity, setNewCity] = useState("");
  const [newArrivalDate, setNewArrivalDate] = useState("");
  const [newDepartureDate, setNewDepartureDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCity, setEditCity] = useState("");
  const [editArrivalDate, setEditArrivalDate] = useState("");
  const [editDepartureDate, setEditDepartureDate] = useState("");
  const [loading, setLoading] = useState(false);
  const isOrganizer = role === "organizer";

  const segments = buildJourneySegments(origin, stops, initialLegs, fareCounts);
  const stopIndexMap = new Map(stops.map((s, i) => [s.id, i]));

  function nullableDate(value: string): string | null {
    return value.trim() ? value : null;
  }

  function inputDate(value: string | null): string {
    return value ? value.slice(0, 10) : "";
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCity.trim()) return;
    setLoading(true);
    const stop = await createStopAction(tripId, {
      city: newCity.trim(),
      arrival_date: nullableDate(newArrivalDate),
      departure_date: nullableDate(newDepartureDate),
    });
    if (stop) {
      setStops((prev) => [...prev, stop]);
      setNewCity("");
      setNewArrivalDate("");
      setNewDepartureDate("");
    }
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(stopId: string) {
    setLoading(true);
    await deleteStopAction(tripId, stopId);
    setStops((prev) => prev.filter((s) => s.id !== stopId));
    setLoading(false);
    router.refresh();
  }

  function handleEdit(stop: StopPublic) {
    setEditingId(stop.id);
    setEditCity(stop.city);
    setEditArrivalDate(inputDate(stop.arrival_date));
    setEditDepartureDate(inputDate(stop.departure_date));
  }

  async function handleSaveEdit(stopId: string) {
    if (!editCity.trim()) return;
    setLoading(true);
    const updated = await updateStopAction(tripId, stopId, {
      city: editCity.trim(),
      arrival_date: nullableDate(editArrivalDate),
      departure_date: nullableDate(editDepartureDate),
    });
    if (updated) setStops((prev) => prev.map((s) => (s.id === stopId ? updated : s)));
    setEditingId(null);
    setLoading(false);
    router.refresh();
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const reordered = [...stops];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setStops(reordered);
    await reorderStopsAction(tripId, reordered.map((s) => s.id));
    router.refresh();
  }

  async function handleMoveDown(index: number) {
    if (index === stops.length - 1) return;
    const reordered = [...stops];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    setStops(reordered);
    await reorderStopsAction(tripId, reordered.map((s) => s.id));
    router.refresh();
  }

  async function handleCoverUpload(e: React.FormEvent<HTMLFormElement>, stopId: string) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLoading(true);
    const updated = await updateStopCoverImageAction(tripId, stopId, data);
    if (updated) setStops((prev) => prev.map((s) => (s.id === stopId ? updated : s)));
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="trip-sequence">
      {stops.length === 0 && isOrganizer && (
        <div className="sequence-empty">
          <p className="sequence-empty-hint">
            Adicione a primeira parada para montar o roteiro da viagem.
          </p>
        </div>
      )}

      {stops.length === 0 && !isOrganizer && (
        <p className="trips-empty">Nenhuma parada adicionada.</p>
      )}

      {stops.length > 0 && (
        <div className="sequence-track">
          <div className="seq-origin-node">
            <span className="seq-node-dot" />
            <span className="seq-node-label">
              <span className="seq-iata">{displayCode(origin)}</span>
              <span className="seq-city">{origin}</span>
            </span>
          </div>

          {segments.map((segment) => {
            if (segment.kind === "leg") {
              return (
                <div key={segment.key} className="seq-leg-connector">
                  <div className="seq-leg-line" />
                  {segment.legId ? (
                    <Link
                      href={`/trips/${tripId}/legs/${segment.legId}`}
                      className="seq-leg-card"
                    >
                      <span className="seq-leg-icon">✈</span>
                      <span className="seq-leg-info">
                        <span className="seq-leg-route">
                          {segment.from.code}
                          <span className="seq-leg-arrow">→</span>
                          {segment.to.code}
                        </span>
                        {segment.fareCount === 0 ? (
                          <span className="seq-leg-cta">pesquisar passagens →</span>
                        ) : (
                          <span className="seq-leg-count">
                            {segment.fareCount}{" "}
                            {segment.fareCount === 1 ? "pesquisa" : "pesquisas"} →
                          </span>
                        )}
                      </span>
                    </Link>
                  ) : (
                    <div className="seq-leg-card seq-leg-card--no-leg">
                      <span className="seq-leg-icon">✈</span>
                      <span className="seq-leg-info">
                        <span className="seq-leg-route">
                          {segment.from.code}
                          <span className="seq-leg-arrow">→</span>
                          {segment.to.code}
                        </span>
                        <span className="seq-leg-cta seq-leg-cta--pending">
                          trajeto a derivar
                        </span>
                      </span>
                    </div>
                  )}
                  <div className="seq-leg-line" />
                </div>
              );
            }

            const stop = segment.stop;
            const stopIndex = stopIndexMap.get(stop.id) ?? 0;

            return (
              <div key={segment.key} className="seq-stop-node">
                {editingId === stop.id ? (
                  <div className="stop-edit-row">
                    <label className="field">
                      <span>Cidade da Parada</span>
                      <input
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(stop.id)}
                        className="stop-edit-input"
                      />
                    </label>
                    <div className="form-row">
                      <label className="field">
                        <span>Chegada</span>
                        <input
                          type="date"
                          value={editArrivalDate}
                          onChange={(e) => setEditArrivalDate(e.target.value)}
                          className="stop-edit-input"
                        />
                      </label>
                      <label className="field">
                        <span>Saída</span>
                        <input
                          type="date"
                          value={editDepartureDate}
                          onChange={(e) => setEditDepartureDate(e.target.value)}
                          className="stop-edit-input"
                        />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(stop.id)}
                        disabled={loading}
                        className="primary-button"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="secondary-button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bp stop-bp">
                    <div className="cover" data-tone={coverTone(stop.city, stopIndex)}>
                      {stop.cover_image_url && (
                        // biome-ignore lint/performance/noImgElement: R2/CDN URL is environment-owned and served directly.
                        <img
                          alt={`Foto de capa de ${stop.city}`}
                          className="cover-img"
                          src={stop.cover_image_url}
                        />
                      )}
                      <span className="cover-skyline" />
                      <span className="cover-note">
                        {stop.airport_code ?? displayCode(stop.city)}
                      </span>
                      <span className="cover-caption">{stop.city}</span>
                    </div>
                    <div className="stop-body">
                      <div className="stop-city">
                        {stop.city}
                        <span className="stop-code">
                          {stop.airport_code ?? displayCode(stop.city)}
                        </span>
                      </div>
                      <div className="stop-date">
                        {formatDate(stop.arrival_date) ?? "Data a definir"}
                        {stop.departure_date ? ` – ${formatDate(stop.departure_date)}` : ""}
                        {nightsBetween(stop.arrival_date, stop.departure_date)
                          ? ` · ${nightsBetween(stop.arrival_date, stop.departure_date)} noites`
                          : ""}
                      </div>
                    </div>
                    <div className="perf" />
                    <div className="stop-stub">
                      <span>Parada {stop.order}</span>
                      <span className="roteiro-preview">+ roteiro</span>
                    </div>
                    {isOrganizer && (
                      <div className="stop-actions">
                        <form
                          className="cover-upload-form"
                          encType="multipart/form-data"
                          onSubmit={(e) => handleCoverUpload(e, stop.id)}
                        >
                          <input
                            aria-label={`Foto de capa de ${stop.city}`}
                            className="cover-upload-input"
                            name="file"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            required
                          />
                          <button type="submit" disabled={loading} className="secondary-button">
                            Editar foto
                          </button>
                        </form>
                        <button
                          type="button"
                          onClick={() => handleMoveUp(stopIndex)}
                          disabled={stopIndex === 0 || loading}
                          className="icon-button"
                          title="Mover para cima"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(stopIndex)}
                          disabled={stopIndex === stops.length - 1 || loading}
                          className="icon-button"
                          title="Mover para baixo"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(stop)}
                          className="secondary-button"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(stop.id)}
                          disabled={loading}
                          className="danger-button"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="seq-origin-node seq-origin-node--return">
            <span className="seq-node-dot" />
            <span className="seq-node-label">
              <span className="seq-iata">{displayCode(origin)}</span>
              <span className="seq-city">{origin}</span>
              <span className="seq-tag">retorno</span>
            </span>
          </div>
        </div>
      )}

      {isOrganizer && (
        <form onSubmit={handleAdd} className="stop-add-form">
          <label className="field">
            <span>Cidade da Parada</span>
            <input
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Lisboa"
              className="stop-edit-input"
              required
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Chegada</span>
              <input
                type="date"
                value={newArrivalDate}
                onChange={(e) => setNewArrivalDate(e.target.value)}
                className="stop-edit-input"
              />
            </label>
            <label className="field">
              <span>Saída</span>
              <input
                type="date"
                value={newDepartureDate}
                onChange={(e) => setNewDepartureDate(e.target.value)}
                className="stop-edit-input"
              />
            </label>
          </div>
          <button type="submit" disabled={loading} className="primary-button">
            Adicionar Parada
          </button>
        </form>
      )}
    </div>
  );
}
