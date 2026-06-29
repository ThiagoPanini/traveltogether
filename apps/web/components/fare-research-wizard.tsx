"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Trajeto } from "@/lib/trips/backbone";
import {
  createFareResearchDraft,
  draftFromFareResearch,
  type FareResearch,
  type FareResearchDraft,
  type ResearchTransferKind,
  withReturnSegment,
} from "@/lib/trips/fare-research";
import { transferLabel } from "@/lib/trips/transfers";
import styles from "./fare-research.module.css";

const TRANSFER_OPTIONS: Array<{
  kind: ResearchTransferKind;
  label: string;
  glyph: string;
  note: string;
}> = [
  { kind: "plane", label: "Avião", glyph: "✈", note: "aeroporto e escala" },
  { kind: "rental_car", label: "Carro alugado", glyph: "⛒", note: "preço por veículo" },
  { kind: "bus", label: "Ônibus", glyph: "⊟", note: "linha rodoviária" },
  { kind: "train", label: "Trem", glyph: "⊞", note: "companhia ferroviária" },
  { kind: "van", label: "Van / transfer", glyph: "⊡", note: "serviço compartilhado" },
  { kind: "other", label: "Outro", glyph: "⋯", note: "balsa, carona…" },
];

type FareResearchWizardProps = {
  tripName?: string;
  trajeto: Trajeto;
  trajectoryIndex?: number;
  trajectoryTotal?: number;
  existing?: FareResearch;
  onClose: () => void;
  onSave: (draft: FareResearchDraft) => void;
};

/** Takeover de Pesquisa do redesign: dois passos e canhoto-resumo sempre presente. */
export function FareResearchWizard({
  tripName = "Viagem",
  trajeto,
  trajectoryIndex = 1,
  trajectoryTotal = 1,
  existing,
  onClose,
  onSave,
}: FareResearchWizardProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<FareResearchDraft>(() => {
    const base = existing ? draftFromFareResearch(existing) : createFareResearchDraft(trajeto);
    return {
      ...base,
      transferKind: base.transferKind || "plane",
      currency: "BRL",
    };
  });
  const [error, setError] = useState("");
  const receipt = makeReceipt(draft, trajeto);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  function change(next: Partial<FareResearchDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setError("");
  }

  function chooseTransfer(kind: ResearchTransferKind) {
    change({
      transferKind: kind,
      otherTransfer: kind === "other" ? draft.otherTransfer : "",
      priceBasis: kind === "rental_car" || kind === "van" ? "vehicle" : draft.priceBasis,
    });
  }

  function setScope(includeReturn: boolean) {
    setDraft((current) => withReturnSegment(current, includeReturn));
    setError("");
  }

  function back() {
    if (step === 1) {
      onClose();
      return;
    }
    setError("");
    setStep(1);
  }

  function primary() {
    if (step === 1) {
      const nextError = validateStepOne(draft);
      if (nextError) {
        setError(nextError);
        return;
      }
      setError("");
      setStep(2);
      return;
    }

    const nextError = validateStepTwo(draft);
    if (nextError) {
      setError(nextError);
      return;
    }
    onSave({
      ...draft,
      provider: draft.provider || "Pesquisa pessoal",
      loyaltyProgram: draft.loyaltyProgram.trim() || "Pontos",
    });
  }

  return (
    <div className={styles.takeover} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.wizardHeader}>
          <nav className={styles.wizardCrumb} aria-label="Caminho">
            <button type="button" onClick={onClose}>
              {tripName}
            </button>
            <span aria-hidden="true">→</span>
            <span>Nova pesquisa</span>
          </nav>
          <div className={styles.wizardHero}>
            <div>
              <span className={styles.wizardEyebrow}>
                <span aria-hidden="true" />
                Trajeto {trajectoryIndex} de {trajectoryTotal} ·{" "}
                {trajeto.kind === "ida" ? "sua ida · pessoal" : "compartilhado"}
              </span>
              <h1 id={titleId}>Pesquisar translado</h1>
              <p>
                {trajeto.from} <span aria-hidden="true">→</span> {trajeto.to}
              </p>
            </div>
            <StepBars step={step} />
          </div>
        </header>

        <div className={styles.wizardBody}>
          <section className={styles.formPanel}>
            {step === 1 ? (
              <StepTypeAndScope
                draft={draft}
                onChange={change}
                onChoose={chooseTransfer}
                onScope={setScope}
              />
            ) : (
              <StepValues draft={draft} onChange={change} />
            )}
            {error ? (
              <p className={styles.errorText} role="alert">
                {error}
              </p>
            ) : null}
          </section>

          <Receipt
            receipt={receipt}
            trajectoryIndex={trajectoryIndex}
            trajectoryTotal={trajectoryTotal}
          />
        </div>

        <footer className={styles.wizardFooter}>
          <details className={styles.mobileReceipt}>
            <summary>
              <span>Canhoto</span>
              <strong>{receipt.trajeto}</strong>
            </summary>
            <ReceiptRows receipt={receipt} />
          </details>
          <div className={styles.footerActions}>
            <button type="button" className={styles.secondaryButton} onClick={back}>
              {step === 1 ? "Cancelar" : "Voltar"}
            </button>
            <span>Pesquisa pessoal · só você edita a sua</span>
            <button type="button" className={styles.primaryButton} onClick={primary}>
              {step === 1 ? "Continuar" : existing ? "Salvar alterações" : "Registrar pesquisa"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function StepBars({ step }: { step: number }) {
  return (
    <div className={styles.stepBars}>
      <div>
        <span className={styles.barActive} />
        <strong>01 · Tipo &amp; escopo</strong>
      </div>
      <div>
        <span className={step === 2 ? styles.barActive : ""} />
        <strong className={step === 2 ? "" : styles.stepMuted}>02 · Valores</strong>
      </div>
    </div>
  );
}

function StepTypeAndScope({
  draft,
  onChange,
  onChoose,
  onScope,
}: {
  draft: FareResearchDraft;
  onChange: (next: Partial<FareResearchDraft>) => void;
  onChoose: (kind: ResearchTransferKind) => void;
  onScope: (includeReturn: boolean) => void;
}) {
  return (
    <div className={styles.stepContent}>
      <span className={styles.formLabel}>Tipo de translado</span>
      <div className={styles.transferGrid}>
        {TRANSFER_OPTIONS.map((option) => {
          const active = draft.transferKind === option.kind;
          return (
            <button
              key={option.kind}
              type="button"
              className={active ? styles.transferActive : ""}
              aria-pressed={active}
              onClick={() => onChoose(option.kind)}
            >
              <span aria-hidden="true">{option.glyph}</span>
              <strong>{option.label}</strong>
              <small>{option.note}</small>
            </button>
          );
        })}
      </div>

      {draft.transferKind === "other" ? (
        <label className={styles.field}>
          <span>Qual translado?</span>
          <input
            value={draft.otherTransfer}
            onChange={(event) => onChange({ otherTransfer: event.target.value })}
            placeholder="Balsa, carona, traslado do hotel…"
          />
        </label>
      ) : null}

      <span className={styles.formLabel}>Escopo da cotação</span>
      <div className={styles.scopeButtons}>
        <button
          type="button"
          className={!draft.includeReturn ? styles.scopeActive : ""}
          aria-pressed={!draft.includeReturn}
          onClick={() => onScope(false)}
        >
          <strong>Só ida</strong>
          <small>1 trecho</small>
        </button>
        <button
          type="button"
          className={draft.includeReturn ? styles.scopeActive : ""}
          aria-pressed={draft.includeReturn}
          onClick={() => onScope(true)}
        >
          <strong>Ida e volta</strong>
          <small>2 trechos</small>
        </button>
      </div>
    </div>
  );
}

function StepValues({
  draft,
  onChange,
}: {
  draft: FareResearchDraft;
  onChange: (next: Partial<FareResearchDraft>) => void;
}) {
  return (
    <div className={styles.stepContent}>
      <span className={styles.formLabel}>Como vocês pagam?</span>
      <div className={styles.valueGrid}>
        <section className={`${styles.valueCard} ${draft.useMoney ? styles.valueActive : ""}`}>
          <button
            type="button"
            className={styles.valueToggle}
            aria-pressed={draft.useMoney}
            onClick={() => onChange({ useMoney: !draft.useMoney })}
          >
            <span>{draft.useMoney ? "✓" : ""}</span>
            <strong>Dinheiro</strong>
          </button>
          {draft.useMoney ? (
            <div className={styles.amountBox}>
              <span>R$</span>
              <input
                inputMode="decimal"
                value={draft.moneyAmount}
                onChange={(event) => onChange({ moneyAmount: event.target.value, currency: "BRL" })}
                placeholder="0,00"
              />
            </div>
          ) : null}
        </section>

        <section className={`${styles.valueCard} ${draft.usePoints ? styles.valueActive : ""}`}>
          <button
            type="button"
            className={styles.valueToggle}
            aria-pressed={draft.usePoints}
            onClick={() => onChange({ usePoints: !draft.usePoints })}
          >
            <span>{draft.usePoints ? "✓" : ""}</span>
            <strong>Pontos</strong>
          </button>
          {draft.usePoints ? (
            <div className={styles.amountBox}>
              <input
                inputMode="numeric"
                value={draft.pointsAmount}
                onChange={(event) => onChange({ pointsAmount: event.target.value })}
                placeholder="0"
              />
              <span>pts</span>
            </div>
          ) : (
            <small>Toque para informar pontos</small>
          )}
        </section>
      </div>

      <div className={styles.infoBox}>
        <span aria-hidden="true">✦</span>
        <p>
          Dinheiro e pontos ficam lado a lado — <strong>não somamos nem convertemos</strong>. Cada
          pessoa compara dentro da mesma unidade.
        </p>
      </div>

      <span className={styles.formLabel}>O valor é…</span>
      <div className={styles.basisButtons}>
        <button
          type="button"
          className={draft.priceBasis === "person" ? styles.scopeActive : ""}
          aria-pressed={draft.priceBasis === "person"}
          onClick={() => onChange({ priceBasis: "person" })}
        >
          Por pessoa
        </button>
        <button
          type="button"
          className={draft.priceBasis === "vehicle" ? styles.scopeActive : ""}
          aria-pressed={draft.priceBasis === "vehicle"}
          onClick={() => onChange({ priceBasis: "vehicle" })}
        >
          Por veículo
        </button>
      </div>
    </div>
  );
}

function Receipt({
  receipt,
  trajectoryIndex,
  trajectoryTotal,
}: {
  receipt: ReturnType<typeof makeReceipt>;
  trajectoryIndex: number;
  trajectoryTotal: number;
}) {
  return (
    <aside className={styles.receipt} aria-label="Canhoto da pesquisa">
      <span aria-hidden="true" className={styles.receiptBite} />
      <div className={styles.receiptHead}>
        <span>Canhoto · sua pesquisa</span>
        <span aria-hidden="true">✦</span>
      </div>
      <strong>{receipt.trajeto}</strong>
      <small>
        Trajeto {trajectoryIndex} de {trajectoryTotal} · pessoal
      </small>
      <ReceiptRows receipt={receipt} />
      <p>A pesquisa entra no trajeto. Marquem a preferida depois, no painel da viagem.</p>
    </aside>
  );
}

function ReceiptRows({ receipt }: { receipt: ReturnType<typeof makeReceipt> }) {
  return (
    <dl className={styles.receiptRows}>
      <div>
        <dt>Tipo</dt>
        <dd>{receipt.tipo}</dd>
      </div>
      <div>
        <dt>Escopo</dt>
        <dd>{receipt.escopo}</dd>
      </div>
      <div>
        <dt>Dinheiro</dt>
        <dd>{receipt.money}</dd>
      </div>
      <div>
        <dt>Pontos</dt>
        <dd>{receipt.points}</dd>
      </div>
      <div>
        <dt>Base</dt>
        <dd>{receipt.basis}</dd>
      </div>
    </dl>
  );
}

function makeReceipt(draft: FareResearchDraft, trajeto: Trajeto) {
  const tipo = draft.transferKind
    ? draft.transferKind === "other"
      ? draft.otherTransfer || "Outro"
      : transferLabel({ kind: draft.transferKind })
    : "—";
  return {
    trajeto: `${trajeto.from} → ${trajeto.to}`,
    tipo,
    escopo: draft.includeReturn ? "Ida e volta" : "Só ida",
    money: draft.useMoney && draft.moneyAmount ? `R$ ${draft.moneyAmount}` : "—",
    points: draft.usePoints && draft.pointsAmount ? `${draft.pointsAmount} pts` : "—",
    basis: draft.priceBasis === "person" ? "Por pessoa" : "Por veículo",
  };
}

function validateStepOne(draft: FareResearchDraft): string {
  if (!draft.transferKind) return "Escolha o tipo de translado.";
  if (draft.transferKind === "other" && !draft.otherTransfer.trim()) {
    return "Descreva o tipo de translado.";
  }
  return "";
}

function validateStepTwo(draft: FareResearchDraft): string {
  const validMoney = draft.useMoney && parsePositiveNumber(draft.moneyAmount) > 0;
  const validPoints = draft.usePoints && parsePositiveNumber(draft.pointsAmount) > 0;
  if (!validMoney && !validPoints) return "Informe dinheiro e/ou pontos para registrar a pesquisa.";
  if (draft.useMoney && !validMoney) return "Informe um valor em dinheiro maior que zero.";
  if (draft.usePoints && !validPoints) return "Informe a quantidade de pontos.";
  return "";
}

function parsePositiveNumber(value: string): number {
  const compact = value.trim().replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(compact)
      ? compact.replace(/\./g, "")
      : compact;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
