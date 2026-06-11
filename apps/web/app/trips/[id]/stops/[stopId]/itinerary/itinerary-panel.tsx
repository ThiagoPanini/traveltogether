"use client";

import type { ItineraryItemPublic, MembershipRole } from "@traveltogether/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createItineraryItemAction,
  deleteItineraryItemAction,
  reorderItineraryItemsAction,
  updateItineraryItemAction,
} from "./actions";

interface Props {
  tripId: string;
  stopId: string;
  initialItems: ItineraryItemPublic[];
  role: MembershipRole;
}

function formatDay(value: string | null): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export default function ItineraryPanel({ tripId, stopId, initialItems, role }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ItineraryItemPublic[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDay, setEditDay] = useState("");
  const [editTime, setEditTime] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newDay, setNewDay] = useState("");
  const [newTime, setNewTime] = useState("");
  const isOrganizer = role === "organizer";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    const item = await createItineraryItemAction(tripId, stopId, {
      title: newTitle.trim(),
      notes: newNotes.trim() || undefined,
      link: newLink.trim() || undefined,
      day: newDay || null,
      time: newTime || null,
    });
    if (item) {
      setItems((prev) => [...prev, item]);
      setNewTitle("");
      setNewNotes("");
      setNewLink("");
      setNewDay("");
      setNewTime("");
    }
    setLoading(false);
    router.refresh();
  }

  function startEdit(item: ItineraryItemPublic) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditNotes(item.notes);
    setEditLink(item.link);
    setEditDay(item.day ?? "");
    setEditTime(item.time ?? "");
  }

  async function handleSaveEdit(itemId: string) {
    if (!editTitle.trim()) return;
    setLoading(true);
    const updated = await updateItineraryItemAction(tripId, stopId, itemId, {
      title: editTitle.trim(),
      notes: editNotes.trim(),
      link: editLink.trim(),
      day: editDay || null,
      time: editTime || null,
    });
    if (updated) setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    setEditingId(null);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(itemId: string) {
    setLoading(true);
    await deleteItineraryItemAction(tripId, stopId, itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setLoading(false);
    router.refresh();
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const reordered = [...items];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setItems(reordered);
    await reorderItineraryItemsAction(
      tripId,
      stopId,
      reordered.map((i) => i.id),
    );
    router.refresh();
  }

  async function handleMoveDown(index: number) {
    if (index === items.length - 1) return;
    const reordered = [...items];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    setItems(reordered);
    await reorderItineraryItemsAction(
      tripId,
      stopId,
      reordered.map((i) => i.id),
    );
    router.refresh();
  }

  return (
    <div className="itinerary-panel">
      {items.length === 0 && !isOrganizer && (
        <p className="trips-empty">Nenhum item no roteiro ainda.</p>
      )}

      {items.length === 0 && isOrganizer && (
        <p className="trips-empty">Roteiro vazio. Adicione o primeiro item abaixo.</p>
      )}

      {items.length > 0 && (
        <ol className="itinerary-list">
          {items.map((item, index) => (
            <li key={item.id} className="itinerary-item">
              {editingId === item.id ? (
                <div className="itinerary-edit-form">
                  <label className="field">
                    <span>Título</span>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(item.id)}
                      className="stop-edit-input"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Observações</span>
                    <input
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="stop-edit-input"
                      placeholder="Reservar com antecedência…"
                    />
                  </label>
                  <label className="field">
                    <span>Link</span>
                    <input
                      value={editLink}
                      onChange={(e) => setEditLink(e.target.value)}
                      className="stop-edit-input"
                      placeholder="https://…"
                    />
                  </label>
                  <div className="form-row">
                    <label className="field">
                      <span>Dia</span>
                      <input
                        type="date"
                        value={editDay}
                        onChange={(e) => setEditDay(e.target.value)}
                        className="stop-edit-input"
                      />
                    </label>
                    <label className="field">
                      <span>Horário</span>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="stop-edit-input"
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
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
                <div className="itinerary-item-body">
                  <div className="itinerary-item-main">
                    <span className="itinerary-item-title">{item.title}</span>
                    {(item.day || item.time) && (
                      <span className="itinerary-item-when">
                        {formatDay(item.day)}
                        {item.time ? ` · ${item.time}` : ""}
                      </span>
                    )}
                    {item.notes && <span className="itinerary-item-notes">{item.notes}</span>}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="itinerary-item-link"
                      >
                        {item.link}
                      </a>
                    )}
                  </div>
                  {isOrganizer && (
                    <div className="stop-actions">
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
                        disabled={index === items.length - 1 || loading}
                        className="icon-button"
                        title="Mover para baixo"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="secondary-button"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={loading}
                        className="danger-button"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {isOrganizer && (
        <form onSubmit={handleAdd} className="stop-add-form">
          <label className="field">
            <span>Título</span>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Visitar Castelo de São Jorge"
              className="stop-edit-input"
              required
            />
          </label>
          <label className="field">
            <span>Observações</span>
            <input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="stop-edit-input"
              placeholder="Opcional"
            />
          </label>
          <label className="field">
            <span>Link</span>
            <input
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              className="stop-edit-input"
              placeholder="https://…"
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Dia</span>
              <input
                type="date"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                className="stop-edit-input"
              />
            </label>
            <label className="field">
              <span>Horário</span>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="stop-edit-input"
              />
            </label>
          </div>
          <button type="submit" disabled={loading} className="primary-button">
            Adicionar ao Roteiro
          </button>
        </form>
      )}
    </div>
  );
}
