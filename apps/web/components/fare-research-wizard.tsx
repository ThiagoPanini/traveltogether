"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bus,
  Car,
  Check,
  CircleDollarSign,
  CircleHelp,
  Coins,
  Plane,
  Save,
  TrainFront,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Trajeto } from "@/lib/trips/backbone";
import {
  createFareResearchDraft,
  draftFromFareResearch,
  type FareResearch,
  type FareResearchDraft,
  type ResearchSegment,
  type ResearchTransferKind,
  validateFareResearchStep,
  withReturnSegment,
} from "@/lib/trips/fare-research";
import { transferLabel } from "@/lib/trips/transfers";
import styles from "./fare-research.module.css";
import { Wordmark } from "./wordmark";

const STEPS = ["Translado", "Detalhes", "Valor", "Revisar"] as const;

const TRANSFER_OPTIONS: Array<{
  kind: ResearchTransferKind;
  label: string;
  note: string;
  icon: typeof Plane;
}> = [
  { kind: "plane", label: "Avião", note: "aeroporto e escala", icon: Plane },
  { kind: "rental_car", label: "Carro alugado", note: "preço por veículo", icon: Car },
  { kind: "bus", label: "Ônibus", note: "linha rodoviária", icon: Bus },
  { kind: "train", label: "Trem", note: "companhia ferroviária", icon: TrainFront },
  { kind: "van", label: "Van / transfer", note: "serviço compartilhado", icon: Truck },
  { kind: "other", label: "Outro", note: "balsa, carona…", icon: CircleHelp },
];

type FareResearchWizardProps = {
  trajeto: Trajeto;
  existing?: FareResearch;
  onClose: () => void;
  onSave: (draft: FareResearchDraft) => void;
};

/**
 * Takeover para registrar uma Pesquisa. A forma é uma prancheta de despacho: quatro passos,
 * canhoto-resumo sempre visível e campos que mudam pelo tipo sem misturar regras aéreas e
 * terrestres. Persiste só quando o pai confirma; Esc/X cancelam sem tocar a ficha existente.
 */
export function FareResearchWizard({
  trajeto,
  existing,
  onClose,
  onSave,
}: FareResearchWizardProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<FareResearchDraft>(() =>
    existing ? draftFromFareResearch(existing) : createFareResearchDraft(trajeto),
  );
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
    setErrors([]);
  }

  function updateSegment(id: string, next: Partial<ResearchSegment>) {
    change({
      segments: draft.segments.map((segment) =>
        segment.id === id ? { ...segment, ...next } : segment,
      ),
    });
  }

  function chooseTransfer(kind: ResearchTransferKind) {
    change({
      transferKind: kind,
      usePoints: kind === "plane" ? draft.usePoints : false,
      priceBasis: kind === "rental_car" || kind === "van" ? "vehicle" : "person",
      segments:
        kind === "plane"
          ? draft.segments
          : draft.segments.map((segment) => ({
              ...segment,
              originCode: "",
              destinationCode: "",
            })),
    });
  }

  function advance() {
    const nextErrors = validateFareResearchStep(draft, step);
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors([]);
    setStep((current) => Math.min(STEPS.length, current + 1));
  }

  function back() {
    setErrors([]);
    setStep((current) => Math.max(1, current - 1));
  }

  function submit() {
    const allErrors = [1, 2, 3].flatMap((candidate) => validateFareResearchStep(draft, candidate));
    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }
    onSave(draft);
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
          <div className={styles.wizardBrand}>
            <Wordmark size={15} />
            <span className={styles.headerDivider} aria-hidden="true" />
            <span className={styles.headerLabel} id={titleId}>
              {existing ? "Editar pesquisa" : "Nova pesquisa"}
            </span>
          </div>
          <div className={styles.headerRoute}>
            <span>{trajeto.from}</span>
            <span className="sr-only"> para </span>
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>{trajeto.to}</span>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar wizard"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>

        <nav className={styles.stepNav} aria-label="Etapas da pesquisa">
          <ol>
            {STEPS.map((label, index) => {
              const number = index + 1;
              const done = number < step;
              const current = number === step;
              return (
                <li key={label} className={styles.stepItem}>
                  <button
                    type="button"
                    className={`${styles.stepButton} ${current ? styles.stepCurrent : ""}`}
                    disabled={number >= step}
                    aria-current={current ? "step" : undefined}
                    onClick={() => number < step && setStep(number)}
                  >
                    <span className={styles.stepNumber}>
                      {done ? (
                        <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                      ) : (
                        `0${number}`
                      )}
                    </span>
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={styles.wizardBody}>
          <section className={styles.formPanel}>
            {step === 1 ? (
              <StepTransfer
                draft={draft}
                trajeto={trajeto}
                onChoose={chooseTransfer}
                onChange={change}
              />
            ) : null}
            {step === 2 ? (
              <StepDetails draft={draft} onChange={change} onSegmentChange={updateSegment} />
            ) : null}
            {step === 3 ? <StepPrice draft={draft} onChange={change} /> : null}
            {step === 4 ? <StepReview draft={draft} existing={existing} /> : null}

            {errors.length > 0 ? (
              <div className={styles.errorBox} role="alert">
                <strong>Revise antes de continuar</strong>
                <ul>
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <ResearchStub draft={draft} trajeto={trajeto} step={step} />
        </div>

        <footer className={styles.wizardFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={step === 1 ? onClose : back}
          >
            <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
            {step === 1 ? "Cancelar" : "Voltar"}
          </button>
          <span className={styles.footerNote}>
            Passo {step} de {STEPS.length} · rascunho local
          </span>
          {step < STEPS.length ? (
            <button type="button" className={styles.primaryButton} onClick={advance}>
              Continuar <ArrowRight size={15} strokeWidth={1.7} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className={styles.primaryButton} onClick={submit}>
              <Save size={15} strokeWidth={1.7} aria-hidden="true" />
              {existing ? "Salvar alterações" : "Registrar pesquisa"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function StepTransfer({
  draft,
  trajeto,
  onChoose,
  onChange,
}: {
  draft: FareResearchDraft;
  trajeto: Trajeto;
  onChoose: (kind: ResearchTransferKind) => void;
  onChange: (next: Partial<FareResearchDraft>) => void;
}) {
  const selectedIsReturn = trajeto.kind === "volta-seed";
  return (
    <div className={styles.stepContent}>
      <p className={styles.eyebrow}>01 · O item encontrado</p>
      <h1 className={styles.stepTitle}>Como você chega lá?</h1>
      <p className={styles.stepIntro}>
        O translado proposto é só uma pista. Registre o que você realmente encontrou para o grupo
        comparar.
      </p>

      <fieldset className={styles.fieldset}>
        <legend>Tipo de translado</legend>
        <div className={styles.transferGrid}>
          {TRANSFER_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = draft.transferKind === option.kind;
            return (
              <button
                key={option.kind}
                type="button"
                className={`${styles.transferOption} ${active ? styles.optionActive : ""}`}
                aria-pressed={active}
                onClick={() => onChoose(option.kind)}
              >
                <Icon size={21} strokeWidth={1.4} aria-hidden="true" />
                <span className={styles.optionName}>{option.label}</span>
                <span className={styles.optionNote}>{option.note}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {draft.transferKind === "other" ? (
        <label className={styles.field}>
          <span>Nome do translado</span>
          <input
            type="text"
            value={draft.otherTransfer}
            onChange={(event) => onChange({ otherTransfer: event.target.value })}
            placeholder="Ex.: balsa"
          />
        </label>
      ) : null}

      <fieldset className={styles.fieldset}>
        <legend>Trechos cobertos pelo mesmo item</legend>
        <div className={styles.scopeGrid}>
          <button
            type="button"
            className={`${styles.scopeOption} ${!draft.includeReturn ? styles.scopeActive : ""}`}
            aria-pressed={!draft.includeReturn}
            onClick={() => onChange(withReturnSegment(draft, false, selectedIsReturn))}
          >
            <span className={styles.scopeKicker}>{selectedIsReturn ? "Só volta" : "Só ida"}</span>
            <strong>
              {trajeto.from} → {trajeto.to}
            </strong>
            <span>1 Trecho · 1 item</span>
          </button>
          <button
            type="button"
            className={`${styles.scopeOption} ${draft.includeReturn ? styles.scopeActive : ""}`}
            aria-pressed={draft.includeReturn}
            onClick={() => onChange(withReturnSegment(draft, true, selectedIsReturn))}
          >
            <span className={styles.scopeKicker}>Ida e volta</span>
            <strong>
              {trajeto.from} ⇄ {trajeto.to}
            </strong>
            <span>2 Trechos · 1 item</span>
          </button>
        </div>
        <p className={styles.fieldHint}>
          O preço será registrado uma vez para o item inteiro — nunca dividido entre os Trechos.
        </p>
      </fieldset>
    </div>
  );
}

function StepDetails({
  draft,
  onChange,
  onSegmentChange,
}: {
  draft: FareResearchDraft;
  onChange: (next: Partial<FareResearchDraft>) => void;
  onSegmentChange: (id: string, next: Partial<ResearchSegment>) => void;
}) {
  const plane = draft.transferKind === "plane";
  return (
    <div className={styles.stepContent}>
      <p className={styles.eyebrow}>02 · A ficha técnica</p>
      <h2 className={styles.stepTitle}>Dê contorno à pesquisa</h2>
      <p className={styles.stepIntro}>
        Datas, pontas e fornecedor bastam para alguém reencontrar a mesma opção depois.
      </p>

      <div className={styles.twoColumns}>
        <label className={styles.field}>
          <span>Empresa ou plataforma</span>
          <input
            type="text"
            value={draft.provider}
            onChange={(event) => onChange({ provider: event.target.value })}
            placeholder={plane ? "Ex.: LATAM" : "Ex.: FlixBus"}
          />
        </label>
        <label className={styles.field}>
          <span>Referência · opcional</span>
          <input
            type="text"
            value={draft.reference}
            onChange={(event) => onChange({ reference: event.target.value })}
            placeholder={plane ? "Ex.: LA 8180" : "Ex.: linha 205"}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>Link da pesquisa · opcional</span>
        <input
          type="url"
          value={draft.link}
          onChange={(event) => onChange({ link: event.target.value })}
          placeholder="https://"
        />
      </label>

      <div className={styles.segmentList}>
        {draft.segments.map((segment, index) => (
          <fieldset key={segment.id} className={styles.segmentCard}>
            <legend>
              {draft.segments.length > 1 ? (index === 0 ? "Ida" : "Volta") : "Trecho"}
            </legend>
            <div className={styles.segmentRoute}>
              <strong>{segment.from}</strong>
              <ArrowRight size={16} strokeWidth={1.4} aria-hidden="true" />
              <strong>{segment.to}</strong>
            </div>
            {plane ? (
              <div className={styles.codePair}>
                <label className={styles.codeField}>
                  <span>Aeroporto de saída</span>
                  <input
                    type="text"
                    maxLength={3}
                    value={segment.originCode}
                    onChange={(event) =>
                      onSegmentChange(segment.id, {
                        originCode: event.target.value.replace(/[^a-z]/gi, "").toUpperCase(),
                      })
                    }
                    placeholder="GRU"
                    aria-label={`Aeroporto de saída ${index + 1}`}
                  />
                </label>
                <span className={styles.codeArrow} aria-hidden="true">
                  →
                </span>
                <label className={styles.codeField}>
                  <span>Aeroporto de chegada</span>
                  <input
                    type="text"
                    maxLength={3}
                    value={segment.destinationCode}
                    onChange={(event) =>
                      onSegmentChange(segment.id, {
                        destinationCode: event.target.value.replace(/[^a-z]/gi, "").toUpperCase(),
                      })
                    }
                    placeholder="JFK"
                    aria-label={`Aeroporto de chegada ${index + 1}`}
                  />
                </label>
              </div>
            ) : null}
            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Data de saída</span>
                <input
                  type="date"
                  value={segment.departureDate}
                  onChange={(event) =>
                    onSegmentChange(segment.id, { departureDate: event.target.value })
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Horário · opcional</span>
                <input
                  type="time"
                  value={segment.departureTime}
                  onChange={(event) =>
                    onSegmentChange(segment.id, { departureTime: event.target.value })
                  }
                />
              </label>
            </div>
          </fieldset>
        ))}
      </div>

      {plane ? (
        <label className={`${styles.field} ${styles.compactField}`}>
          <span>Escalas no bilhete</span>
          <select value={draft.stops} onChange={(event) => onChange({ stops: event.target.value })}>
            <option value="0">Direto</option>
            <option value="1">1 escala</option>
            <option value="2">2 escalas</option>
            <option value="3">3 ou mais</option>
          </select>
          <small>Escala é técnica dentro do item; não cria outro Trecho.</small>
        </label>
      ) : null}
    </div>
  );
}

function StepPrice({
  draft,
  onChange,
}: {
  draft: FareResearchDraft;
  onChange: (next: Partial<FareResearchDraft>) => void;
}) {
  const plane = draft.transferKind === "plane";
  return (
    <div className={styles.stepContent}>
      <p className={styles.eyebrow}>03 · A etiqueta de valor</p>
      <h2 className={styles.stepTitle}>Registre sem converter</h2>
      <p className={styles.stepIntro}>
        Dinheiro e pontos são dimensões separadas. O grupo enxerga; o app não declara vencedor.
      </p>

      <fieldset className={styles.fieldset}>
        <legend>Como o preço foi anunciado?</legend>
        <div className={styles.basisToggle}>
          <button
            type="button"
            aria-pressed={draft.priceBasis === "person"}
            className={draft.priceBasis === "person" ? styles.basisActive : ""}
            onClick={() => onChange({ priceBasis: "person" })}
          >
            Por pessoa
          </button>
          <button
            type="button"
            aria-pressed={draft.priceBasis === "vehicle"}
            className={draft.priceBasis === "vehicle" ? styles.basisActive : ""}
            onClick={() => onChange({ priceBasis: "vehicle" })}
          >
            Por veículo / serviço
          </button>
        </div>
      </fieldset>

      <div className={styles.priceStack}>
        <section className={`${styles.priceCard} ${draft.useMoney ? styles.priceCardActive : ""}`}>
          <label className={styles.priceToggle}>
            <input
              type="checkbox"
              checked={draft.useMoney}
              onChange={(event) => onChange({ useMoney: event.target.checked })}
            />
            <CircleDollarSign size={19} strokeWidth={1.4} aria-hidden="true" />
            <span>
              <strong>Dinheiro</strong>
              <small>na moeda encontrada</small>
            </span>
          </label>
          {draft.useMoney ? (
            <div className={styles.moneyRow}>
              <label className={styles.currencyField}>
                <span>Moeda</span>
                <select
                  value={draft.currency}
                  onChange={(event) =>
                    onChange({ currency: event.target.value as FareResearchDraft["currency"] })
                  }
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
              <label className={`${styles.field} ${styles.amountField}`}>
                <span>Valor do item inteiro</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.moneyAmount}
                  onChange={(event) => onChange({ moneyAmount: event.target.value })}
                  placeholder="0,00"
                />
              </label>
            </div>
          ) : null}
        </section>

        {plane ? (
          <section
            className={`${styles.priceCard} ${draft.usePoints ? styles.priceCardActive : ""}`}
          >
            <label className={styles.priceToggle}>
              <input
                type="checkbox"
                checked={draft.usePoints}
                onChange={(event) => onChange({ usePoints: event.target.checked })}
              />
              <Coins size={19} strokeWidth={1.4} aria-hidden="true" />
              <span>
                <strong>Pontos</strong>
                <small>sem equivalência em dinheiro</small>
              </span>
            </label>
            {draft.usePoints ? (
              <div className={styles.twoColumns}>
                <label className={styles.field}>
                  <span>Quantidade</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={draft.pointsAmount}
                    onChange={(event) => onChange({ pointsAmount: event.target.value })}
                    placeholder="Ex.: 75000"
                  />
                </label>
                <label className={styles.field}>
                  <span>Programa de fidelidade</span>
                  <input
                    type="text"
                    value={draft.loyaltyProgram}
                    onChange={(event) => onChange({ loyaltyProgram: event.target.value })}
                    placeholder="Ex.: LATAM Pass"
                  />
                </label>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <label className={styles.field}>
        <span>Notas para a tripulação · opcional</span>
        <textarea
          rows={4}
          value={draft.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder="Bagagem, cancelamento, retirada, o que vale lembrar…"
        />
      </label>
    </div>
  );
}

function StepReview({ draft, existing }: { draft: FareResearchDraft; existing?: FareResearch }) {
  return (
    <div className={styles.stepContent}>
      <p className={styles.eyebrow}>04 · Conferência final</p>
      <h2 className={styles.stepTitle}>Pronta para compartilhar</h2>
      <p className={styles.stepIntro}>
        A ficha entra no Trajeto de origem e fica visível como uma Pesquisa — não como decisão do
        grupo.
      </p>

      <div className={styles.reviewManifest}>
        <div>
          <span>Translado</span>
          <strong>
            {draft.transferKind
              ? draft.transferKind === "other"
                ? draft.otherTransfer
                : transferLabel({ kind: draft.transferKind })
              : "A definir"}
          </strong>
        </div>
        <div>
          <span>Cobertura</span>
          <strong>{draft.segments.length === 2 ? "Ida e volta · 2 Trechos" : "1 Trecho"}</strong>
        </div>
        <div>
          <span>Fornecedor</span>
          <strong>{draft.provider || "A definir"}</strong>
        </div>
        <div>
          <span>Base do preço</span>
          <strong>{draft.priceBasis === "person" ? "Por pessoa" : "Por veículo / serviço"}</strong>
        </div>
      </div>

      <div className={styles.localNotice}>
        <Save size={18} strokeWidth={1.4} aria-hidden="true" />
        <div>
          <strong>{existing ? "Alterações prontas" : "Ficha pronta"}</strong>
          <p>
            Nesta versão de interface, ela fica guardada neste navegador e pode ser editada ou
            removida no Painel da Viagem.
          </p>
        </div>
      </div>
    </div>
  );
}

function ResearchStub({
  draft,
  trajeto,
  step,
}: {
  draft: FareResearchDraft;
  trajeto: Trajeto;
  step: number;
}) {
  const transfer = draft.transferKind
    ? draft.transferKind === "other"
      ? draft.otherTransfer || "Outro"
      : transferLabel({ kind: draft.transferKind })
    : "Translado a definir";
  const money =
    draft.useMoney && draft.moneyAmount ? `${draft.currency} ${draft.moneyAmount}` : "—";
  const points = draft.usePoints && draft.pointsAmount ? `${draft.pointsAmount} pts` : null;

  return (
    <aside className={styles.stub} aria-label="Resumo da pesquisa">
      <div className={styles.stubTopline}>
        <span>Ficha de pesquisa</span>
        <span>0{step} / 04</span>
      </div>
      <div className={styles.stubRoute}>
        <span>{draft.segments[0]?.originCode || shortPlace(trajeto.from)}</span>
        <span className={styles.stubFlight} aria-hidden="true">
          <span />
          {draft.transferKind === "plane" ? (
            <Plane size={18} strokeWidth={1.2} />
          ) : (
            <ArrowRight size={18} />
          )}
          <span />
        </span>
        <span>{draft.segments[0]?.destinationCode || shortPlace(trajeto.to)}</span>
      </div>
      <p className={styles.stubCities}>
        {trajeto.from} → {trajeto.to}
      </p>
      <div className={styles.stubGrid}>
        <div>
          <span>Tipo</span>
          <strong>{transfer}</strong>
        </div>
        <div>
          <span>Item</span>
          <strong>{draft.includeReturn ? "Ida + volta" : "1 Trecho"}</strong>
        </div>
        <div>
          <span>Empresa</span>
          <strong>{draft.provider || "—"}</strong>
        </div>
        <div>
          <span>Saída</span>
          <strong>{formatDraftDate(draft.segments[0]?.departureDate)}</strong>
        </div>
      </div>
      <div className={styles.stubValue}>
        <span>Valor do item inteiro</span>
        <strong>{money}</strong>
        {points ? (
          <em>
            ou {points} · {draft.loyaltyProgram || "programa"}
          </em>
        ) : null}
        <small>{draft.priceBasis === "person" ? "por pessoa" : "por veículo / serviço"}</small>
      </div>
      <div className={styles.stubFoot}>
        <span>O app alinha.</span>
        <strong>Você decide.</strong>
      </div>
    </aside>
  );
}

function shortPlace(place: string): string {
  return place
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/gi, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "·");
}

function formatDraftDate(value: string | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
