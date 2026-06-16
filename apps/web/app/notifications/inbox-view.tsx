"use client";

import type {
  NotificationKind,
  NotificationPrefsPublic,
  NotificationPublic,
} from "@traveltogether/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Icon } from "@/components/atlas";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  updateNotificationPrefsAction,
} from "../actions/notifications";

const KIND_LABEL: Record<NotificationKind, string> = {
  invite: "convite",
  decision: "escolhida",
  task: "tarefa",
  mention: "menção",
};

// `digest` é o resumo periódico; os demais são interruptores por `kind`.
const PREF_LABEL: Record<keyof NotificationPrefsPublic, string> = {
  decision: "Escolhidas marcadas",
  task: "Tarefas atribuídas a mim",
  mention: "Menções em comentários",
  digest: "Resumo periódico por e-mail",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InboxView({
  items,
  prefs,
}: {
  items: NotificationPublic[];
  prefs: NotificationPrefsPublic | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openPrefs, setOpenPrefs] = useState(false);
  const [draftPrefs, setDraftPrefs] = useState<NotificationPrefsPublic | null>(prefs);

  const hasUnread = items.some((n) => n.read_at === null);

  function markRead(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  function togglePref(key: keyof NotificationPrefsPublic) {
    if (!draftPrefs) return;
    const next = { ...draftPrefs, [key]: !draftPrefs[key] };
    setDraftPrefs(next);
    startTransition(async () => {
      await updateNotificationPrefsAction({ [key]: next[key] });
      router.refresh();
    });
  }

  return (
    <>
      <div className="section-head" style={{ marginBottom: 28 }}>
        <div>
          <div className="kicker" style={{ marginBottom: 8 }}>
            avisos
          </div>
          <h1 className="display" style={{ fontSize: 38 }}>
            Notificações
          </h1>
        </div>
        <span className="spacer" style={{ flex: 1 }} />
        {hasUnread && (
          <button className="btn small" disabled={pending} onClick={markAll} type="button">
            <Icon name="checkSquare" size={13} /> Marcar todas como lidas
          </button>
        )}
        <button
          className="btn small"
          onClick={() => setOpenPrefs((v) => !v)}
          type="button"
          aria-expanded={openPrefs}
        >
          <Icon name="bell" size={13} /> Preferências
        </button>
      </div>

      {openPrefs && draftPrefs && (
        <div className="card flat" style={{ padding: "20px 24px", marginBottom: 24 }}>
          <div className="kicker" style={{ marginBottom: 14 }}>
            o que me avisa
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {(Object.keys(PREF_LABEL) as (keyof NotificationPrefsPublic)[]).map((key) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <input
                  checked={draftPrefs[key]}
                  disabled={pending}
                  onChange={() => togglePref(key)}
                  type="checkbox"
                />
                {PREF_LABEL[key]}
              </label>
            ))}
          </div>
          <p className="soft" style={{ fontSize: 12.5, marginTop: 14 }}>
            Convites sempre chegam — não têm interruptor.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <Icon name="bell" size={22} />
          <div style={{ fontWeight: 600, color: "var(--ink-soft)" }}>Nada por aqui ainda.</div>
          <div style={{ fontSize: 13.5, maxWidth: 420 }}>
            Convites, escolhidas, tarefas e menções aparecem aqui.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((n) => {
            const unread = n.read_at === null;
            return (
              <div
                key={n.id}
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderLeft: unread ? "3px solid var(--accent)" : "3px solid transparent",
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
                  {KIND_LABEL[n.kind]}
                </span>
                <Link
                  href={`/trips/${n.trip_id}`}
                  style={{
                    fontWeight: unread ? 600 : 500,
                    fontSize: 14.5,
                    textDecoration: "none",
                    color: "inherit",
                    minWidth: 0,
                  }}
                >
                  {n.text}
                </Link>
                <span className="spacer" style={{ flex: 1 }} />
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}
                >
                  {formatWhen(n.created_at)}
                </span>
                {unread && (
                  <button
                    className="icon-btn"
                    disabled={pending}
                    onClick={() => markRead(n.id)}
                    type="button"
                    aria-label="Marcar como lida"
                  >
                    <Icon name="checkSquare" size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
