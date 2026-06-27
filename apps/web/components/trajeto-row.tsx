"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { formatTripDate, type Trajeto, trajetoStatus } from "@/lib/trips/backbone";
import { StatusPill } from "./status-pill";
import styles from "./trajeto-row.module.css";

/** Enquadramento por-pessoa do salto (CONTEXT inv. 6) — as pontas são suas, o meio é do grupo. */
const KICKER: Record<Trajeto["kind"], string> = {
  ida: "sua ida",
  shared: "translado compartilhado",
  "volta-seed": "sua volta",
};

/**
 * Linha da timeline de Trajetos — data · ponto de estado · conteúdo (rota + pílula de estado,
 * kicker por-pessoa e o card honesto da proposta). O CTA abre a camada de exploração sem chamar
 * o Trajeto de Trecho; Pesquisas já registradas entram como filhos. É um `li`: use dentro de `ol`.
 */
export function TrajetoRow({
  trajeto,
  researchCount = 0,
  onAddResearch,
  children,
}: {
  trajeto: Trajeto;
  researchCount?: number;
  onAddResearch: () => void;
  children?: ReactNode;
}) {
  const status = trajetoStatus(trajeto);
  const date = formatTripDate(trajeto.date);
  const proposed = status.tone === "accent";
  const isSeed = trajeto.kind === "volta-seed";

  // Prompt honesto do card: já-proposto vale pra qualquer salto (por-pessoa); sem proposta,
  // a ponta de ida é sua (proponha, singular) e o salto compartilhado é do grupo (alinhem).
  let prompt: string;
  if (isSeed) {
    prompt = "A volta começa aqui — registre o item só de volta ou uma Pesquisa ida-e-volta.";
  } else if (proposed) {
    prompt = "Translado proposto — cada pessoa ainda pesquisa e decide a sua.";
  } else if (trajeto.kind === "ida") {
    prompt = "Sem translado proposto — proponha o meio da sua ida.";
  } else {
    prompt = "Sem translado proposto — alinhem o meio deste salto.";
  }

  return (
    <li className={styles.row}>
      {/* Sem data, o "—" é decorativo: o estado indefinido já vem na StatusPill. */}
      <span className={styles.date} aria-hidden={date === null ? "true" : undefined}>
        {date ?? "—"}
      </span>
      <span className={styles.rail} aria-hidden="true">
        <span className={`${styles.dot} ${styles[status.tone]}`} />
      </span>
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.title}>
            {trajeto.from}
            {/* Conector lido por leitor de tela; a seta fica só no visual. */}
            <span className="sr-only"> para </span>
            <span className={styles.arrow} aria-hidden="true">
              {" → "}
            </span>
            {trajeto.to}
          </span>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        <p className={styles.kicker}>{KICKER[trajeto.kind]}</p>

        <div
          className={`${styles.card} ${
            proposed ? styles.cardAccent : isSeed ? styles.cardSeed : styles.cardWarning
          }`}
        >
          <div>
            <p className={styles.prompt}>{prompt}</p>
            {researchCount > 0 ? (
              <p className={styles.researchCount}>
                {researchCount}{" "}
                {researchCount === 1 ? "pesquisa registrada" : "pesquisas registradas"}
              </p>
            ) : null}
          </div>
          <button type="button" className={styles.cta} onClick={onAddResearch}>
            <Plus size={14} strokeWidth={1.8} aria-hidden="true" /> Registrar pesquisa
          </button>
        </div>
        {children}
      </div>
    </li>
  );
}
