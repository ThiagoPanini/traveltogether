"use client";

import { DESCRIPTION_MAX, NAME_MAX } from "@/lib/trips/draft";
import { RouteBand } from "./route-band";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";

/**
 * Passo 4 — Identidade. Nome em destaque (Saira, grande, sem pré-preenchimento,
 * obrigatório) + descrição opcional com contador (≤220). O grafo da rota encolhe e
 * vira faixa horizontal de referência (cross-fade; respeita prefers-reduced-motion).
 * Sem mapa neste passo.
 */
export function StepIdentidade({ draft, dispatch, origin }: StepProps) {
  return (
    <div className={styles.single}>
      <header className={styles.sectionHead}>
        <p className={styles.eyebrow}>Passo 04 · Identidade</p>
        <h1 className={styles.title}>Dê um nome à viagem</h1>
        <p className={styles.lede}>
          Um nome que o grupo reconheça de cara — e, se quiser, uma frase pra dar o tom.
        </p>
      </header>

      <div className={styles.fields}>
        <label className={styles.field} htmlFor="identity-name">
          <span className={styles.label}>Nome da viagem</span>
          <input
            id="identity-name"
            type="text"
            className={`${styles.input} ${styles.nameInput}`}
            maxLength={NAME_MAX}
            value={draft.name}
            onChange={(event) => dispatch({ type: "setName", name: event.target.value })}
            placeholder="Ex.: Costa Leste"
            required
          />
        </label>

        <label className={styles.field} htmlFor="identity-description">
          <span className={styles.label}>Descrição (opcional)</span>
          <textarea
            id="identity-description"
            className={styles.textarea}
            maxLength={DESCRIPTION_MAX}
            value={draft.description}
            onChange={(event) =>
              dispatch({ type: "setDescription", description: event.target.value })
            }
            placeholder="Ex.: duas semanas subindo a costa, sem pressa."
          />
          <span className={styles.counter}>
            {draft.description.length}/{DESCRIPTION_MAX}
          </span>
        </label>
      </div>

      <div className={styles.bandBlock}>
        <span className={styles.bandCaption}>Sua rota</span>
        <RouteBand
          origin={origin}
          stops={draft.stops}
          entryTransfer={draft.entryTransfer}
          animate
        />
      </div>
    </div>
  );
}
