"use client";

import { Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import type { InviteRole } from "@/lib/trips/draft";
import { RoleIcon } from "./transfer-icons";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";
import { originLabel } from "./wizard-types";

const ROLES: { value: InviteRole; label: string }[] = [
  { value: "member", label: "Membro" },
  { value: "organizer", label: "Organizador" },
];

function looksLikeEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

/**
 * Passo 5 — Tripulação (convidar; convite cego — ADR-0002). Card "você · organizador"
 * (deriva do Perfil) + campo de e-mail. Convites nascem Membro; o papel é ajustado só
 * no card pendente, que mostra apenas e-mail + status até o aceite.
 */
export function StepTripulacao({ draft, dispatch, origin }: StepProps) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  function add() {
    if (!looksLikeEmail(email)) {
      setTouched(true);
      return;
    }
    dispatch({ type: "addInvite", email });
    setEmail("");
    setTouched(false);
  }

  const invalid = touched && !looksLikeEmail(email);
  return (
    <div className={styles.single}>
      <header className={styles.sectionHead}>
        <p className={styles.eyebrow}>Passo 05 · Tripulação</p>
        <h1 className={styles.title}>Quem embarca com vocês?</h1>
        <p className={styles.lede}>
          Convide por e-mail. Todo Convite nasce como Membro; ajuste o papel no card depois de
          adicionar. A pessoa só entra ao aceitar, e você também pode convidar depois.
        </p>
      </header>

      <div className={styles.youCard}>
        <span className={styles.youAvatar} aria-hidden="true">
          <RoleIcon kind="organizer" size={16} />
        </span>
        <span className={styles.youBody}>
          <span className={styles.youName}>Você</span>
          <span className={styles.youMeta}>{originLabel(origin)} · criou a viagem</span>
        </span>
        <span className={styles.youBadge}>Organizador</span>
      </div>

      <form
        className={styles.inviteForm}
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <label className={styles.field} htmlFor="invite-email">
          <span className={styles.label}>E-mail do convidado</span>
          <div className={styles.inviteInputWrap}>
            <Mail
              className={styles.inviteInputIcon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <input
              id="invite-email"
              type="email"
              className={`${styles.input} ${styles.inviteInput}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="pessoa@exemplo.com"
              aria-invalid={invalid}
            />
          </div>
        </label>
        <button type="submit" className={styles.secondary}>
          <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" /> Adicionar
        </button>
      </form>
      {invalid ? (
        <p className={styles.error} role="alert">
          Confira o e-mail — algo como pessoa@exemplo.com.
        </p>
      ) : null}

      {draft.invitations.length > 0 ? (
        <ul className={styles.inviteList} aria-label="Convites pendentes">
          {draft.invitations.map((invite) => (
            <li key={invite.email} className={styles.inviteCard}>
              <span className={styles.inviteBlind} aria-hidden="true">
                ?
              </span>
              <span className={styles.inviteInfo}>
                <span className={styles.inviteEmail}>{invite.email}</span>
                <span className={styles.invitePending}>Pendente</span>
              </span>
              <fieldset className={styles.roleToggle} aria-label={`Papel de ${invite.email}`}>
                {ROLES.map((r) => {
                  const active = invite.role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      className={`${styles.roleBtn} ${active ? styles.roleBtnActive : ""}`}
                      aria-pressed={active}
                      onClick={() =>
                        dispatch({ type: "setInviteRole", email: invite.email, role: r.value })
                      }
                    >
                      <RoleIcon kind={r.value} size={14} />
                      {r.label}
                    </button>
                  );
                })}
              </fieldset>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={`Revogar convite de ${invite.email}`}
                onClick={() => dispatch({ type: "removeInvite", email: invite.email })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
