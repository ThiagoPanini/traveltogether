"use client";

import type {
  ItineraryItemCreate,
  ItineraryItemPublic,
  MembershipRole,
} from "@traveltogether/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/atlas";
import CommentThread from "@/components/comment-thread";
import { PlaceAutocomplete } from "@/components/place-autocomplete";
import { placeToItemFields } from "@/lib/itinerary/place-fill";
import {
  createItineraryItemAction,
  deleteItineraryItemAction,
  updateItineraryItemAction,
} from "./actions";

interface Props {
  tripId: string;
  stopId: string;
  currentUserId: string;
  initialItems: ItineraryItemPublic[];
  role: MembershipRole;
  arrivalDate: string | null;
  departureDate: string | null;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nightsBetween(arrival: string, departure: string): number {
  const a = new Date(`${arrival.slice(0, 10)}T00:00:00`).getTime();
  const b = new Date(`${departure.slice(0, 10)}T00:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function fmtDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function AddItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (item: { title: string; time: string; notes: string; link: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  return (
    <div style={{ padding: "16px 20px", background: "var(--surface-2)" }}>
      <div className="form-grid" style={{ gap: 12 }}>
        <div className="form-row" style={{ gridTemplateColumns: "110px 1fr" }}>
          <label className="field">
            <span>Horário</span>
            <input
              lang="pt-BR"
              onChange={(e) => setTime(e.target.value)}
              type="time"
              value={time}
            />
          </label>
          <PlaceAutocomplete
            onChange={setTitle}
            onSelect={(place) => {
              const fields = placeToItemFields(place, { notes, link });
              setTitle(fields.title);
              setNotes(fields.notes);
              setLink(fields.link);
            }}
            value={title}
          />
        </div>
        <div className="form-row cols-2">
          <label className="field">
            <span>Notas (opcional)</span>
            <input
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comprar ingresso antes…"
              value={notes}
            />
          </label>
          <label className="field">
            <span>Link (opcional)</span>
            <input onChange={(e) => setLink(e.target.value)} placeholder="https://…" value={link} />
          </label>
        </div>
      </div>
      <div className="form-actions" style={{ marginTop: 14 }}>
        <button className="btn tiny ghost" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button
          className="btn tiny accent"
          disabled={!title.trim()}
          onClick={() =>
            onAdd({ title: title.trim(), time, notes: notes.trim(), link: link.trim() })
          }
          type="button"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

export default function ItineraryPanel({
  tripId,
  stopId,
  currentUserId,
  initialItems,
  role,
  arrivalDate,
  departureDate,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ItineraryItemPublic[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editTime, setEditTime] = useState("");
  const [openThread, setOpenThread] = useState<string | null>(null);
  const isOrganizer = role === "organizer";

  const hasWindow = Boolean(arrivalDate && departureDate);
  const dayCount = hasWindow
    ? nightsBetween(arrivalDate as string, departureDate as string) + 1
    : 0;

  const days = hasWindow
    ? Array.from({ length: dayCount }, (_, i) => {
        const date = addDays(arrivalDate as string, i);
        return {
          n: i + 1,
          date,
          items: items
            .filter((it) => it.day?.slice(0, 10) === date)
            .sort((a, b) => (a.time || "99").localeCompare(b.time || "99")),
        };
      })
    : [];

  const dayDates = new Set(days.map((d) => d.date));
  const unscheduled = items.filter((it) => !it.day || !dayDates.has(it.day.slice(0, 10)));

  async function handleAdd(payload: ItineraryItemCreate) {
    setLoading(true);
    const item = await createItineraryItemAction(tripId, stopId, payload);
    if (item) setItems((prev) => [...prev, item]);
    setAddingDay(null);
    setLoading(false);
    router.refresh();
  }

  function startEdit(item: ItineraryItemPublic) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditNotes(item.notes);
    setEditLink(item.link);
    setEditTime(item.time ?? "");
  }

  async function handleSaveEdit(itemId: string) {
    if (!editTitle.trim()) return;
    setLoading(true);
    const updated = await updateItineraryItemAction(tripId, stopId, itemId, {
      title: editTitle.trim(),
      notes: editNotes.trim(),
      link: editLink.trim(),
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

  const itemRow = (item: ItineraryItemPublic) => {
    if (editingId === item.id) {
      return (
        <div key={item.id} style={{ padding: "16px 20px", background: "var(--surface-2)" }}>
          <div className="form-grid" style={{ gap: 12 }}>
            <div className="form-row" style={{ gridTemplateColumns: "110px 1fr" }}>
              <label className="field">
                <span>Horário</span>
                <input
                  lang="pt-BR"
                  onChange={(e) => setEditTime(e.target.value)}
                  type="time"
                  value={editTime}
                />
              </label>
              <label className="field">
                <span>O que fazer</span>
                <input
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(item.id)}
                  value={editTitle}
                />
              </label>
            </div>
            <div className="form-row cols-2">
              <label className="field">
                <span>Notas</span>
                <input onChange={(e) => setEditNotes(e.target.value)} value={editNotes} />
              </label>
              <label className="field">
                <span>Link</span>
                <input
                  onChange={(e) => setEditLink(e.target.value)}
                  placeholder="https://…"
                  value={editLink}
                />
              </label>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 14 }}>
            <button className="btn tiny ghost" onClick={() => setEditingId(null)} type="button">
              Cancelar
            </button>
            <button
              className="btn tiny accent"
              disabled={loading}
              onClick={() => handleSaveEdit(item.id)}
              type="button"
            >
              Salvar
            </button>
          </div>
        </div>
      );
    }
    const threadOpen = openThread === item.id;
    return (
      <div key={item.id}>
        <div
          className="board-row"
          style={{ gridTemplateColumns: "64px 1fr auto", padding: "13px 20px" }}
        >
          <span
            className="mono-num"
            style={{
              fontSize: 13,
              color: item.time ? "var(--accent)" : "var(--muted)",
              fontWeight: 600,
            }}
          >
            {item.time || "—"}
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {item.title}
              {item.link && (
                <a
                  className="link-btn"
                  href={item.link}
                  rel="noreferrer"
                  style={{ fontSize: 12, marginLeft: 10, fontWeight: 500 }}
                  target="_blank"
                >
                  link ↗
                </a>
              )}
            </div>
            {item.notes && (
              <div className="soft" style={{ fontSize: 13.5, marginTop: 2, textWrap: "pretty" }}>
                {item.notes}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              className={`btn tiny ghost ${threadOpen ? "on" : ""}`}
              onClick={() => setOpenThread(threadOpen ? null : item.id)}
              title="Comentários"
              type="button"
            >
              <Icon name="message" size={13} />
            </button>
            {isOrganizer && (
              <>
                <button className="btn tiny ghost" onClick={() => startEdit(item)} type="button">
                  Editar
                </button>
                <button
                  className="icon-btn"
                  disabled={loading}
                  onClick={() => handleDelete(item.id)}
                  title="Excluir item"
                  type="button"
                >
                  <Icon name="trash" size={13} />
                </button>
              </>
            )}
          </div>
        </div>
        {threadOpen && (
          <div style={{ padding: "0 20px 14px" }}>
            <CommentThread
              tripId={tripId}
              targetType="itinerary_item"
              targetId={item.id}
              currentUserId={currentUserId}
              role={role}
            />
          </div>
        )}
      </div>
    );
  };

  // Sem janela de datas: lista simples (todos os itens), com adição sem dia.
  if (!hasWindow) {
    return (
      <div>
        <div className="section-head">
          <span className="kicker">roteiro</span>
          <h2>
            {items.length ? `${items.length} item${items.length !== 1 ? "s" : ""}` : "Vazio ainda"}
          </h2>
          <span className="spacer" />
          {isOrganizer && (
            <button
              className="btn small ghost"
              onClick={() => setAddingDay(addingDay ? null : "none")}
              type="button"
            >
              <Icon name="plus" size={13} /> Adicionar item
            </button>
          )}
        </div>
        <div className="card flat" style={{ border: "1px solid var(--line)" }}>
          {items.length === 0 && addingDay !== "none" && (
            <div style={{ padding: "16px 20px", fontSize: 13, color: "var(--muted)" }}>
              Defina as datas da parada para organizar o roteiro por dia. Por enquanto, itens ficam
              sem dia.
            </div>
          )}
          {items.map(itemRow)}
          {addingDay === "none" && (
            <AddItemForm
              onAdd={(it) =>
                handleAdd({
                  title: it.title,
                  time: it.time || null,
                  notes: it.notes,
                  link: it.link,
                })
              }
              onCancel={() => setAddingDay(null)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gap: 14 }}>
        {days.map((day) => {
          const open = addingDay === day.date;
          return (
            <div key={day.date} className="card flat" style={{ border: "1px solid var(--line)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom: day.items.length || open ? "1px solid var(--line-soft)" : "none",
                }}
              >
                <span className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  dia {String(day.n).padStart(2, "0")}
                </span>
                <span className="mono-num" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                  {fmtDate(day.date)}
                </span>
                <span className="spacer" style={{ flex: 1 }} />
                {isOrganizer && (
                  <button
                    className="btn tiny ghost"
                    onClick={() => setAddingDay(open ? null : day.date)}
                    type="button"
                  >
                    <Icon name="plus" size={12} /> Item
                  </button>
                )}
              </div>

              {day.items.map(itemRow)}

              {day.items.length === 0 && !open && (
                <div style={{ padding: "12px 20px", fontSize: 13, color: "var(--muted)" }}>
                  Dia livre por enquanto.
                </div>
              )}

              {open && (
                <AddItemForm
                  onAdd={(it) =>
                    handleAdd({
                      title: it.title,
                      time: it.time || null,
                      notes: it.notes,
                      link: it.link,
                      day: day.date,
                    })
                  }
                  onCancel={() => setAddingDay(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="section-head">
            <span className="kicker">sem dia definido</span>
          </div>
          <div className="card flat" style={{ border: "1px solid var(--line)" }}>
            {unscheduled.map(itemRow)}
          </div>
        </div>
      )}
    </div>
  );
}
