"use client";

import { Pencil } from "lucide-react";
import { RouteBand } from "./route-band";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";

const ROLE_LABEL = { member: "Membro", organizer: "Organizador" } as const;

/**
 * Passo 6 — Resumo (boarding-pass). Recap read-only com "editar" por seção (linka pro
 * passo certo preservando o rascunho). Faixa-itinerário horizontal como herói + "em
 * números" + Tripulação. Rota e Translados já vivem na faixa e não se repetem abaixo.
 * O Confirmar (POST atômico) mora no rodapé.
 */
export function StepResumo({ draft, dispatch, origin }: StepProps) {
  function EditBtn({ step }: { step: number }) {
    return (
      <button
        type="button"
        className={styles.editBtn}
        onClick={() => dispatch({ type: "setStep", step })}
      >
        <Pencil size={13} strokeWidth={1.5} aria-hidden="true" /> Editar
      </button>
    );
  }

  return (
    <div className={styles.single}>
      <header className={styles.sectionHead}>
        <p className={styles.eyebrow}>Passo 06 · Resumo</p>
        <h1 className={styles.title}>Confiram o embarque</h1>
        <p className={styles.lede}>
          A viagem inteira antes de criar. Toque em "editar" pra voltar a qualquer passo — nada se
          perde.
        </p>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroHead}>
          <h2 className={styles.heroName}>{draft.name.trim() || "Sem nome ainda"}</h2>
          <EditBtn step={4} />
        </div>
        {draft.description.trim() ? (
          <p className={styles.heroDesc}>{draft.description.trim()}</p>
        ) : null}
        <RouteBand origin={origin} stops={draft.stops} entryTransfer={draft.entryTransfer} />
      </div>

      <div className={styles.numbers}>
        <div className={styles.numberCard}>
          <span className={styles.numberValue}>{draft.stops.length + 1}</span>
          <span className={styles.numberLabel}>Cidades</span>
        </div>
        <div className={styles.numberCard}>
          <span className={styles.numberValue}>{draft.stops.length}</span>
          <span className={styles.numberLabel}>Trajetos</span>
        </div>
        <div className={styles.numberCard}>
          <span className={styles.numberValue}>{draft.invitations.length}</span>
          <span className={styles.numberLabel}>Pessoas convidadas</span>
        </div>
      </div>

      <section className={styles.summary} aria-label="Resumo da viagem">
        <section className={styles.section}>
          <div className={styles.sectionRow}>
            <span className={styles.sectionTitle}>Tripulação</span>
            <EditBtn step={5} />
          </div>
          {draft.invitations.length > 0 ? (
            <ul className={styles.summaryList}>
              <li className={styles.summaryRow}>
                <span>Você</span>
                <span className={styles.summaryMeta}>Organizador</span>
              </li>
              {draft.invitations.map((invite) => (
                <li key={invite.email} className={styles.summaryRow}>
                  <span>{invite.email}</span>
                  <span className={styles.summaryMeta}>{ROLE_LABEL[invite.role]} · pendente</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.heroDesc}>Só você por enquanto — dá pra convidar depois.</p>
          )}
        </section>
      </section>
    </div>
  );
}
