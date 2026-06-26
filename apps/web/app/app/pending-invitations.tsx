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

const ROLE_LABEL = { member: "Membro", organizer: "Organizador" } as const;

/**
 * Convites pendentes do usuário logado (#230). Mutação do client → route handler
 * `/api/invitations/{id}/accept` → API. Ao aceitar, a Participação nasce com o papel
 * do Convite (ADR-0002) e a viagem passa a aparecer; revalida com `router.refresh`.
 */
export function PendingInvitations({ invitations }: { invitations: PendingInvitation[] }) {
  const router = useRouter();
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

  return (
    <section className={styles.invites} aria-label="Convites pendentes">
      <h2 className={styles.invitesTitle}>Convites pendentes</h2>
      <ul className={styles.inviteList}>
        {invitations.map((invite) => (
          <li key={invite.id} className={styles.inviteCard}>
            <span className={styles.inviteInfo}>
              <span className={styles.inviteTrip}>{invite.trip_name}</span>
              <span className={styles.inviteMeta}>
                {ROLE_LABEL[invite.role]}
                {invite.invited_by_name ? ` · de ${invite.invited_by_name}` : ""}
              </span>
            </span>
            <button
              type="button"
              className={styles.acceptBtn}
              disabled={pendingId === invite.id}
              onClick={() => accept(invite.id)}
            >
              {pendingId === invite.id ? "Aceitando…" : "Aceitar"}
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p className={styles.inviteError} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
