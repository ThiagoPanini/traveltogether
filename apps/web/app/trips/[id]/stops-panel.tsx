"use client";

import type { MembershipRole, StopPublic } from "@traveltogether/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createStop, deleteStop, reorderStops, updateStop } from "@/lib/api/trips";

interface Props {
  tripId: string;
  initialStops: StopPublic[];
  role: MembershipRole;
  accessToken: string;
}

export default function StopsPanel({ tripId, initialStops, role, accessToken }: Props) {
  const router = useRouter();
  const [stops, setStops] = useState<StopPublic[]>(initialStops);
  const [newCity, setNewCity] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCity, setEditCity] = useState("");
  const [loading, setLoading] = useState(false);
  const isOrganizer = role === "organizer";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCity.trim()) return;
    setLoading(true);
    const stop = await createStop(accessToken, tripId, { city: newCity.trim() });
    if (stop) {
      setStops((prev) => [...prev, stop]);
      setNewCity("");
    }
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(stopId: string) {
    setLoading(true);
    await deleteStop(accessToken, tripId, stopId);
    setStops((prev) => prev.filter((s) => s.id !== stopId));
    setLoading(false);
    router.refresh();
  }

  async function handleEdit(stop: StopPublic) {
    setEditingId(stop.id);
    setEditCity(stop.city);
  }

  async function handleSaveEdit(stopId: string) {
    if (!editCity.trim()) return;
    setLoading(true);
    const updated = await updateStop(accessToken, tripId, stopId, { city: editCity.trim() });
    if (updated) {
      setStops((prev) => prev.map((s) => (s.id === stopId ? updated : s)));
    }
    setEditingId(null);
    setLoading(false);
    router.refresh();
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const reordered = [...stops];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setStops(reordered);
    await reorderStops(
      accessToken,
      tripId,
      reordered.map((s) => s.id),
    );
    router.refresh();
  }

  async function handleMoveDown(index: number) {
    if (index === stops.length - 1) return;
    const reordered = [...stops];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    setStops(reordered);
    await reorderStops(
      accessToken,
      tripId,
      reordered.map((s) => s.id),
    );
    router.refresh();
  }

  return (
    <div className="stops-panel">
      {stops.length === 0 ? (
        <p className="trips-empty">Nenhuma parada adicionada.</p>
      ) : (
        <ol className="stops-list">
          {stops.map((stop, index) => (
            <li key={stop.id} className="stop-item">
              {editingId === stop.id ? (
                <span className="stop-edit-row">
                  <input
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(stop.id)}
                    className="stop-edit-input"
                  />
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
                </span>
              ) : (
                <span className="stop-row">
                  <span className="stop-order">{stop.order}.</span>
                  <span className="stop-city">{stop.city}</span>
                  {stop.arrival_date && (
                    <span className="stop-date">
                      {new Date(stop.arrival_date).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  {isOrganizer && (
                    <span className="stop-actions">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || loading}
                        className="icon-button"
                        title="Mover para cima"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === stops.length - 1 || loading}
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
                    </span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {isOrganizer && (
        <form onSubmit={handleAdd} className="stop-add-form">
          <input
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="Cidade da parada"
            className="stop-edit-input"
            required
          />
          <button type="submit" disabled={loading} className="primary-button">
            Adicionar Parada
          </button>
        </form>
      )}
    </div>
  );
}
