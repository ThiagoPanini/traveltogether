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
 * kicker por-pessoa e o card honesto da proposta). O card mostra o **translado proposto** (não
 * votos/preço), com CTA "pesquisa de translado · em breve" desabilitado (Rotas ainda não
 * existe). A volta-semente não tem card: ela emerge na pesquisa. É um `li`: use dentro de `ol`.
 */
export function TrajetoRow({ trajeto }: { trajeto: Trajeto }) {
  const status = trajetoStatus(trajeto);
  const date = formatTripDate(trajeto.date);
  const proposed = status.tone === "accent";
  const isSeed = trajeto.kind === "volta-seed";

  // Prompt honesto do card: já-proposto vale pra qualquer salto (por-pessoa); sem proposta,
  // a ponta de ida é sua (proponha, singular) e o salto compartilhado é do grupo (alinhem).
  let prompt: string;
  if (proposed) {
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

        {isSeed ? (
          <p className={styles.seed}>
            A volta emerge quando alguém pesquisar o translado — por pessoa.
          </p>
        ) : (
          <div className={`${styles.card} ${proposed ? styles.cardAccent : styles.cardWarning}`}>
            <p className={styles.prompt}>{prompt}</p>
            <span className={styles.cta} aria-disabled="true">
              pesquisa de translado · em breve
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
