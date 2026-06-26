"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useState } from "react";
import {
  canSubmit,
  clearDraft,
  createInitialDraft,
  draftToPayload,
  getDestination,
  loadDraft,
  saveDraft,
  tripDraftReducer,
} from "@/lib/trips/draft";
import { StepDestino } from "./step-destino";
import { StepIdentidade } from "./step-identidade";
import { StepParadas } from "./step-paradas";
import { StepResumo } from "./step-resumo";
import { StepTranslados } from "./step-translados";
import { StepTripulacao } from "./step-tripulacao";
import styles from "./wizard.module.css";
import type { Origin } from "./wizard-types";

const STEP_LABELS = ["Destino", "Paradas", "Translados", "Identidade", "Tripulação", "Resumo"];

/**
 * Wizard de criação de viagem (6 passos). O rascunho vive todo no cliente, persistido
 * em localStorage (sobrevive a reload — sem status `draft` no servidor, ADR-0011). O
 * Confirmar dispara o POST atômico via `/api/trips`; no sucesso limpa o rascunho e
 * navega pra viagem criada, na falha mantém rascunho + resumo.
 */
export function TripWizard({ origin }: { origin: Origin }) {
  const router = useRouter();
  const [draft, dispatch] = useReducer(tripDraftReducer, undefined, createInitialDraft);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hidrata o rascunho salvo uma vez, depois da montagem (evita mismatch de SSR).
  useEffect(() => {
    const saved = loadDraft();
    if (saved) {
      dispatch({ type: "replace", draft: saved });
    }
    setHydrated(true);
  }, []);

  // Persiste só depois de hidratar — senão o rascunho inicial sobrescreveria o salvo.
  useEffect(() => {
    if (hydrated) {
      saveDraft(draft);
    }
  }, [draft, hydrated]);

  const { step } = draft;
  const isLast = step === STEP_LABELS.length;
  const destinationReady = getDestination(draft).city.trim().length > 0;

  async function confirm() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(draft)),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { id?: string };
      if (!data.id) throw new Error("missing id");
      clearDraft();
      router.push(`/app/viagens/${data.id}`);
    } catch {
      setError("Não consegui criar a viagem agora. Seu rascunho está salvo — tente de novo.");
      setPending(false);
    }
  }

  const stepProps = { draft, dispatch, origin };

  return (
    <main className={styles.screen}>
      <header className={styles.top}>
        <button type="button" className={styles.back} onClick={() => router.push("/app")}>
          ← Minhas viagens
        </button>
        <span className={styles.stepCount}>
          Passo {step} de {STEP_LABELS.length}
        </span>
      </header>

      <div className={styles.shell}>
        <nav className={styles.stepper} aria-label="Passos da criação">
          <ol className={styles.steps}>
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const state = n === step ? styles.stepCurrent : n < step ? styles.stepDone : "";
              return (
                <li key={label} style={{ flex: 1, display: "flex" }}>
                  <button
                    type="button"
                    className={`${styles.step} ${state}`}
                    aria-current={n === step ? "step" : undefined}
                    onClick={() => dispatch({ type: "setStep", step: n })}
                  >
                    <span className={styles.stepBar} aria-hidden="true" />
                    <span className={styles.stepLabel}>{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={styles.body}>
          {step === 1 ? <StepDestino {...stepProps} /> : null}
          {step === 2 ? <StepParadas {...stepProps} /> : null}
          {step === 3 ? <StepTranslados {...stepProps} /> : null}
          {step === 4 ? <StepIdentidade {...stepProps} /> : null}
          {step === 5 ? <StepTripulacao {...stepProps} /> : null}
          {step === 6 ? <StepResumo {...stepProps} /> : null}
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.nav}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => (step === 1 ? router.push("/app") : dispatch({ type: "prev" }))}
          >
            ← Voltar
          </button>
          {isLast ? (
            <button
              type="button"
              className={styles.primary}
              disabled={pending || !canSubmit(draft)}
              onClick={confirm}
            >
              {pending ? "Criando…" : "Criar viagem"}
            </button>
          ) : (
            <button
              type="button"
              className={styles.primary}
              disabled={step === 1 && !destinationReady}
              onClick={() => dispatch({ type: "next" })}
            >
              Próximo →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
