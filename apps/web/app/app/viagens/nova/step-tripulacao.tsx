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
 * Passo 5 — Tripulação (convidar; convite cego — ADR-0002). Recap da viagem + card
 * "você · organizador" (deriva do Perfil) + campo de e-mail com o papel escolhido
 * **antes** de adicionar. Cada convite vira um card pendente que mostra **só** o e-mail
 * ecoado + "pendente" + toggle de papel — nenhum dado de perfil até o aceite.
 */
export function StepTripulacao({ draft, dispatch, origin }: StepProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [touched, setTouched] = useState(false);

  function add() {
    if (!looksLikeEmail(email)) {
      setTouched(true);
      return;
    }
    dispatch({ type: "addInvite", email, role });
    setEmail("");
    setTouched(false);
  }

  const invalid = touched && !looksLikeEmail(email);
  const cities = draft.stops.length + 1;
  const legs = draft.stops.length;
  const route = [originLabel(origin), ...draft.stops.map((s) => s.city.trim() || "—")].join(" → ");

  return (
    <div className={styles.single}>
      <header className={styles.sectionHead}>
        <p className={styles.eyebrow}>Passo 05 · Tripulação</p>
        <h1 className={styles.title}>Quem embarca com vocês?</h1>
        <p className={styles.lede}>
          Convide por e-mail. O convite é cego: a pessoa só entra ao aceitar, com o papel que você
          escolher. Você pode convidar depois também — ninguém precisa estar aqui agora.
        </p>
      </header>

      <div className={styles.recap}>
        <span className={styles.recapName}>{draft.name.trim() || "Sua viagem"}</span>
        <span className={styles.recapRoute}>{route}</span>
        <span className={styles.recapMeta}>
          {cities} cidades · {legs} trajetos
        </span>
      </div>

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
        <fieldset className={styles.roleToggle} aria-label="Papel do convidado">
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                className={`${styles.roleBtn} ${active ? styles.roleBtnActive : ""}`}
                aria-pressed={active}
                onClick={() => setRole(r.value)}
              >
                <RoleIcon kind={r.value} size={14} />
                {r.label}
              </button>
            );
          })}
        </fieldset>
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
