"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./app.module.css";

export type PendingInvitation = {
  id: string;
  trip_id: string;
  trip_name: string;
  role: "organizer" | "member";
  invited_by_name: string | null;
};

function initialFrom(value: string | null): string {
  return value?.trim()[0]?.toUpperCase() || "?";
}

export function PendingInvitations({ invitations }: { invitations: PendingInvitation[] }) {
  const router = useRouter();
  const [visible, setVisible] = useState(invitations);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accept(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/invitations/${id}/accept`, { method: "POST" });
      if (!res.ok) throw new Error("request failed");
      router.refresh();
    } catch {
      setError("Não consegui aceitar o convite agora. Tente de novo.");
      setPendingId(null);
    }
  }

  if (visible.length === 0) {
    return (
      <div className={styles.noInvites}>
        <span>Nenhum convite na fila</span>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.inviteList}>
        {visible.map((invite) => (
          <li key={invite.id} className={styles.inviteCard}>
            <div className={styles.inviteIdentity}>
              <span aria-hidden="true">{initialFrom(invite.invited_by_name)}</span>
              <div>
                <strong>{invite.invited_by_name || "Alguém"}</strong>
                <small>convidou · {invite.trip_name}</small>
              </div>
            </div>
            <div className={styles.inviteActions}>
              <button
                type="button"
                disabled={pendingId === invite.id}
                onClick={() => accept(invite.id)}
              >
                {pendingId === invite.id ? "Aceitando" : "Aceitar"}
              </button>
              <button
                type="button"
                onClick={() => setVisible((items) => items.filter((item) => item.id !== invite.id))}
              >
                Recusar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error ? (
        <p className={styles.inviteError} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
