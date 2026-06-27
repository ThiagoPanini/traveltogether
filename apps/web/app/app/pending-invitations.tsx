"use client";

import { ArrowRight, Mail } from "lucide-react";
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
 * Convites pendentes do usuário logado. A Participação só nasce após o aceite;
 * ao concluir, o painel é revalidado para a nova Viagem entrar no radar.
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
    <section id="convites" className={styles.invites} aria-labelledby="invites-title">
      <div className={styles.invitesIntro}>
        <span className={styles.inviteIcon} aria-hidden="true">
          <Mail size={20} strokeWidth={1.7} />
        </span>
        <div>
          <p className={styles.invitesKicker}>Chamada para embarque</p>
          <h2 id="invites-title">
            {invitations.length} {invitations.length === 1 ? "Convite espera" : "Convites esperam"}{" "}
            seu aceite
          </h2>
        </div>
      </div>
      <ul className={styles.inviteList}>
        {invitations.map((invite) => (
          <li key={invite.id} className={styles.inviteCard}>
            <span className={styles.inviteInfo}>
              <span className={styles.inviteTrip}>{invite.trip_name}</span>
              <span className={styles.inviteMeta}>
                {ROLE_LABEL[invite.role]}
                {invite.invited_by_name ? ` · convite de ${invite.invited_by_name}` : ""}
              </span>
            </span>
            <button
              type="button"
              className={styles.acceptBtn}
              disabled={pendingId === invite.id}
              onClick={() => accept(invite.id)}
            >
              {pendingId === invite.id ? "Aceitando…" : "Aceitar e embarcar"}
              <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
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
