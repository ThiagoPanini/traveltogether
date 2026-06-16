"use client";

import type { InviteForUserPublic } from "@traveltogether/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { acceptInvitationAction, declineInvitationAction } from "@/app/actions/invitations";
import { Icon } from "@/components/atlas";
import { buildInboxView } from "@/lib/invitations/inbox";

interface Props {
  invitations: InviteForUserPublic[];
}

export function InvitationsInbox({ invitations }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const view = buildInboxView(invitations);

  if (view.count === 0) return null;

  async function accept(id: string) {
    setBusyId(id);
    await acceptInvitationAction(id);
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  async function decline(id: string) {
    setBusyId(id);
    await declineInvitationAction(id);
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="card" style={{ marginBottom: 24, borderLeft: "3px solid var(--accent)" }}>
      <div className="section-head" style={{ padding: "16px 20px 0" }}>
        <span className="kicker" style={{ color: "var(--accent)" }}>
          convites
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)", marginLeft: 10 }}>
          {view.headline}
        </span>
      </div>
      <div className="board">
        {view.items.map((inv) => (
          <div
            key={inv.id}
            className="board-row"
            style={{ gridTemplateColumns: "1fr auto auto", alignItems: "center" }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 650 }}>{inv.trip_name}</div>
              <div className="mono-num" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                convite como {inv.role === "organizer" ? "organizador" : "membro"}
              </div>
            </div>
            <button
              className="btn tiny ghost"
              disabled={pending || busyId === inv.id}
              onClick={() => decline(inv.id)}
              type="button"
            >
              Recusar
            </button>
            <button
              className="btn tiny accent"
              disabled={pending || busyId === inv.id}
              onClick={() => accept(inv.id)}
              type="button"
            >
              <Icon name="plus" size={12} /> {busyId === inv.id ? "Entrando…" : "Aceitar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
