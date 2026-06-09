"use client";

import type { MemberWithUser, PendingMembershipPublic } from "@traveltogether/types";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { addMember, removeMember, updateMemberRole } from "@/lib/api/trips";

interface Props {
  accessToken: string;
  tripId: string;
  members: MemberWithUser[];
  pending: PendingMembershipPublic[];
  isOrganizer: boolean;
}

export function MembersPanel({ accessToken, tripId, members, pending, isOrganizer }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [addState, setAddState] = useState<"idle" | "submitting" | "error" | "ok">("idle");
  const [addMsg, setAddMsg] = useState("");

  async function onAddMember(e: FormEvent) {
    e.preventDefault();
    setAddState("submitting");
    const result = await addMember(accessToken, tripId, email);
    if (result) {
      setEmail("");
      setAddState("ok");
      setAddMsg(
        result.pending ? `Convite pendente enviado para ${email}.` : `${email} adicionado.`,
      );
      router.refresh();
    } else {
      setAddState("error");
      setAddMsg("Não foi possível adicionar o membro.");
    }
  }

  async function onPromote(membershipId: string) {
    await updateMemberRole(accessToken, tripId, membershipId, "organizer");
    router.refresh();
  }

  async function onDemote(membershipId: string) {
    await updateMemberRole(accessToken, tripId, membershipId, "member");
    router.refresh();
  }

  async function onRemove(membershipId: string) {
    await removeMember(accessToken, tripId, membershipId);
    router.refresh();
  }

  return (
    <div className="members-panel">
      <section className="members-section">
        <h2>Ativos</h2>
        <ul className="members-list">
          {members.map(({ membership, email: memberEmail }) => (
            <li key={membership.id} className="member-row">
              <span className="member-email">{memberEmail}</span>
              <span className="trip-card-role" data-role={membership.role}>
                {membership.role === "organizer" ? "Organizador" : "Membro"}
              </span>
              {isOrganizer && (
                <span className="member-actions">
                  {membership.role === "member" ? (
                    <button
                      className="secondary-button member-btn"
                      onClick={() => onPromote(membership.id)}
                      type="button"
                    >
                      Promover
                    </button>
                  ) : (
                    <button
                      className="secondary-button member-btn"
                      onClick={() => onDemote(membership.id)}
                      type="button"
                    >
                      Rebaixar
                    </button>
                  )}
                  <button
                    className="secondary-button member-btn danger"
                    onClick={() => onRemove(membership.id)}
                    type="button"
                  >
                    Remover
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {pending.length > 0 && (
        <section className="members-section">
          <h2>Pendentes</h2>
          <ul className="members-list">
            {pending.map((p) => (
              <li key={p.id} className="member-row">
                <span className="member-email">{p.email}</span>
                <span className="trip-card-role" data-role="pending">
                  Pendente
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOrganizer && (
        <section className="members-section">
          <h2>Convidar por e-mail</h2>
          <form className="members-invite-form" onSubmit={onAddMember}>
            <input
              className="members-invite-input"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              type="email"
              value={email}
            />
            <button className="primary-button" disabled={addState === "submitting"} type="submit">
              {addState === "submitting" ? "Adicionando..." : "Adicionar"}
            </button>
          </form>
          {addMsg && (
            <p className={addState === "error" ? "login-message" : "members-ok-msg"} role="status">
              {addMsg}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
