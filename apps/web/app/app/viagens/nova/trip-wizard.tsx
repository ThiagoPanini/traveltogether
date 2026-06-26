"use client";

import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useState } from "react";
import { Wordmark } from "@/components/wordmark";
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
import { isTransferDefined } from "@/lib/trips/transfers";
import { StepDestino } from "./step-destino";
import { StepIdentidade } from "./step-identidade";
import { StepParadas } from "./step-paradas";
import { StepResumo } from "./step-resumo";
import { StepTranslados } from "./step-translados";
import { StepTripulacao } from "./step-tripulacao";
import styles from "./wizard.module.css";
import type { Origin } from "./wizard-types";

const STEP_LABELS = ["Destino", "Paradas", "Translados", "Identidade", "Tripulação", "Resumo"];
const TOTAL_STEPS = STEP_LABELS.length;

/**
 * Wizard de criação de viagem (6 passos) — shell **takeover** full-bleed (header
 * mínimo + stepbar numerada + rodapé fixo). O rascunho vive todo no cliente, persistido
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
  const isLast = step === TOTAL_STEPS;
  const destinationReady = getDestination(draft).city.trim().length > 0;
  // Só o passo 1 trava o avanço (precisa do destino); os demais fluem livres.
  const canAdvance = step !== 1 || destinationReady;

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

  /** Click-nav gated: volta a qualquer passo feito; avança só o próximo (e se puder). */
  function goToStep(n: number) {
    if (n <= step) {
      dispatch({ type: "setStep", step: n });
    } else if (n === step + 1 && canAdvance) {
      dispatch({ type: "next" });
    }
  }

  // Saltos definidos / total (ida pessoal + saltos compartilhados) — alimenta a dica.
  const totalLegs = draft.stops.length;
  const definedLegs =
    (isTransferDefined(draft.entryTransfer) ? 1 : 0) +
    draft.stops.slice(1).filter((s) => isTransferDefined(s.desiredTransfer)).length;

  function footerHint(): string {
    switch (step) {
      case 1:
        return destinationReady
          ? `Destino: ${getDestination(draft).city.trim()}`
          : "Escolha o destino final";
      case 2:
        return `${draft.stops.length} ${draft.stops.length === 1 ? "cidade" : "cidades"} na rota`;
      case 3:
        return `${definedLegs} de ${totalLegs} trajetos definidos`;
      case 4:
        return draft.name.trim() ? "Nome definido" : "Dê um nome à viagem";
      case 5: {
        const crew = draft.invitations.length + 1;
        return `${crew} na tripulação`;
      }
      default:
        return "Confira e confirme";
    }
  }

  const stepProps = { draft, dispatch, origin };

  return (
    <main className={styles.screen}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <Wordmark size={15} />
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.brandLabel}>Criar viagem</span>
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label="Sair (o rascunho fica salvo)"
          onClick={() => router.push("/app")}
        >
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.stepbarWrap}>
        <nav className={styles.stepbar} aria-label="Passos da criação">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            const reachable = n <= step || (n === step + 1 && canAdvance);
            return (
              <div key={label} className={styles.stepItem}>
                {i > 0 ? (
                  <span
                    className={`${styles.stepConn} ${n <= step ? styles.stepConnFilled : ""}`}
                    aria-hidden="true"
                  />
                ) : null}
                <button
                  type="button"
                  className={styles.stepBtn}
                  disabled={!reachable}
                  aria-current={current ? "step" : undefined}
                  onClick={() => goToStep(n)}
                >
                  <span
                    className={`${styles.stepNum} ${done ? styles.stepNumDone : ""} ${
                      current ? styles.stepNumCurrent : ""
                    }`}
                  >
                    {done ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                      String(n).padStart(2, "0")
                    )}
                  </span>
                  <span className={`${styles.stepName} ${current ? styles.stepNameCurrent : ""}`}>
                    {label}
                  </span>
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      <div className={styles.main}>
        {hydrated ? (
          <>
            {step === 1 ? <StepDestino {...stepProps} /> : null}
            {step === 2 ? <StepParadas {...stepProps} /> : null}
            {step === 3 ? <StepTranslados {...stepProps} /> : null}
            {step === 4 ? <StepIdentidade {...stepProps} /> : null}
            {step === 5 ? <StepTripulacao {...stepProps} /> : null}
            {step === 6 ? <StepResumo {...stepProps} /> : null}
          </>
        ) : null}
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => (step === 1 ? router.push("/app") : dispatch({ type: "prev" }))}
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" /> Voltar
        </button>
        <span className={styles.footerSpacer} />
        {error ? (
          <span className={styles.error} role="alert">
            {error}
          </span>
        ) : (
          <span className={styles.footerHint}>{footerHint()}</span>
        )}
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
            disabled={!canAdvance}
            onClick={() => dispatch({ type: "next" })}
          >
            Continuar <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </footer>
    </main>
  );
}
