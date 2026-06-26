"use client";

import { useState } from "react";
import type { InviteRole } from "@/lib/trips/draft";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";

const ROLES: { value: InviteRole; label: string; glyph: string }[] = [
  { value: "member", label: "Membro", glyph: "○" },
  { value: "organizer", label: "Organizador", glyph: "✦" },
];

function looksLikeEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

/**
 * Passo 5 — Tripulação (convidar; convite cego — ADR-0002). Campo de e-mail + adicionar
 * → card pendente que mostra **só** o e-mail ecoado + "pendente" + toggle de papel
 * [Membro | Organizador] (default Membro), distinguido por ícone além de cor. Sem
 * nenhum dado de perfil; o bloco rico (nome/avatar/cidade) só aparece após o aceite.
 */
export function StepTripulacao({ draft, dispatch }: StepProps) {
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
    <div>
      <p className={styles.eyebrow}>Passo 5 · Tripulação</p>
      <h1 className={styles.title}>Quem embarca com vocês?</h1>
      <p className={styles.lede}>
        Convide por e-mail. O convite é cego: a pessoa só entra ao aceitar, com o papel que você
        escolher. Você pode convidar depois também — ninguém precisa estar aqui agora.
      </p>

      <form
        className={styles.inviteForm}
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <label className={styles.field} htmlFor="invite-email">
          <span className={styles.label}>E-mail do convidado</span>
          <input
            id="invite-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="pessoa@exemplo.com"
            aria-invalid={invalid}
          />
        </label>
        <button type="submit" className={styles.secondary}>
          Adicionar
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
                {ROLES.map((role) => {
                  const active = invite.role === role.value;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      className={`${styles.roleBtn} ${active ? styles.roleBtnActive : ""}`}
                      aria-pressed={active}
                      onClick={() =>
                        dispatch({ type: "setInviteRole", email: invite.email, role: role.value })
                      }
                    >
                      <span className={styles.roleGlyph} aria-hidden="true">
                        {role.glyph}
                      </span>
                      {role.label}
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
