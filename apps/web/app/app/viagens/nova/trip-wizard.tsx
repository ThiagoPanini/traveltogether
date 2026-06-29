"use client";

import { useRouter } from "next/navigation";
import { type Dispatch, useEffect, useReducer, useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import {
  canSubmit,
  clearDraft,
  createInitialDraft,
  draftToPayload,
  getDestination,
  loadDraft,
  saveDraft,
  type TransferDraft,
  type TransferKind,
  type TripDraft,
  tripDraftReducer,
} from "@/lib/trips/draft";
import { isTransferDefined, transferLabel } from "@/lib/trips/transfers";
import styles from "./wizard.module.css";
import type { Origin } from "./wizard-types";

const STEPS = [
  { label: "Destino", phase: "Rota" },
  { label: "Paradas", phase: "Rota" },
  { label: "Translados", phase: "Rota" },
  { label: "Nome", phase: "Detalhes" },
  { label: "Tripulação", phase: "Detalhes" },
  { label: "Resumo", phase: "Confirmar" },
] as const;

const TRANSFER_OPTIONS: Array<{ kind: TransferKind; label: string; glyph: string }> = [
  { kind: "plane", label: "Avião", glyph: "✈" },
  { kind: "rental_car", label: "Carro alugado", glyph: "⛒" },
  { kind: "bus", label: "Ônibus", glyph: "⊟" },
  { kind: "train", label: "Trem", glyph: "⊞" },
  { kind: "van", label: "Van / transfer", glyph: "⊡" },
  { kind: "other", label: "Outro", glyph: "⋯" },
];

type Leg = {
  id: string;
  from: string;
  to: string;
  label: string;
  scope: string;
  transfer: TransferDraft | null;
  setTransfer: (transfer: TransferDraft) => void;
};

function countryName(code: string | null): string {
  if (!code) return "País a definir";
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

function originCity(origin: Origin): string {
  return origin.city?.trim() || "São Paulo";
}

function deriveLegs(
  draft: TripDraft,
  origin: Origin,
  dispatch: Dispatch<Parameters<typeof tripDraftReducer>[1]>,
): Leg[] {
  const start = originCity(origin);
  return draft.stops.map((stop, index) => {
    const from = index === 0 ? start : draft.stops[index - 1].city || "Parada";
    const to = stop.city || (index === draft.stops.length - 1 ? "Destino" : "Parada");
    return {
      id: index === 0 ? "entry" : stop.id,
      from,
      to,
      label: `Trajeto ${index + 1} de ${draft.stops.length}`,
      scope: index === 0 ? "Sua ida · pessoal" : "Compartilhado",
      transfer: index === 0 ? draft.entryTransfer : stop.desiredTransfer,
      setTransfer: (transfer) =>
        index === 0
          ? dispatch({ type: "setEntryTransfer", transfer })
          : dispatch({ type: "setStopTransfer", id: stop.id, transfer }),
    };
  });
}

function formatTransfer(transfer: TransferDraft | null): {
  label: string;
  glyph: string;
  defined: boolean;
} {
  if (!transfer || !isTransferDefined(transfer)) {
    return { label: "A definir", glyph: "+", defined: false };
  }
  const option = TRANSFER_OPTIONS.find((item) => item.kind === transfer.kind);
  return { label: transferLabel(transfer), glyph: option?.glyph ?? "✦", defined: true };
}

export function TripWizard({ origin }: { origin: Origin }) {
  const router = useRouter();
  const [draft, dispatch] = useReducer(tripDraftReducer, undefined, createInitialDraft);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openLeg, setOpenLeg] = useState<string | null>(null);
  const [newStop, setNewStop] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    const saved = loadDraft();
    if (saved) dispatch({ type: "replace", draft: saved });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDraft(draft);
  }, [draft, hydrated]);

  const step = draft.step;
  const current = STEPS[step - 1];
  const destination = getDestination(draft);
  const destinationReady = destination.city.trim().length > 0;
  const canAdvance = step !== 1 || destinationReady;
  const legs = deriveLegs(draft, origin, dispatch);
  const definedLegs = legs.filter((leg) => leg.transfer && isTransferDefined(leg.transfer)).length;
  const routeNodes = [
    { city: originCity(origin), tag: "Origem · você", country: origin.country, variant: "origin" },
    ...draft.stops.map((stop, index) => ({
      city: stop.city || (index === draft.stops.length - 1 ? "Destino" : "Parada"),
      tag: index === draft.stops.length - 1 ? "★ Destino final" : `Parada ${index + 1}`,
      country: stop.country,
      variant: index === draft.stops.length - 1 ? "dest" : "stop",
      id: stop.id,
      removable: draft.stops.length > 1 && index < draft.stops.length - 1,
    })),
  ];

  function footerHint(): string {
    switch (step) {
      case 1:
        return "Escolha o destino final";
      case 2:
        return `${routeNodes.length} cidades na rota`;
      case 3:
        return `${definedLegs} de ${legs.length} trajetos definidos`;
      case 4:
        return draft.name.trim() ? "Nome definido" : "Dê um nome à viagem";
      case 5:
        return `${draft.invitations.length + 1} na tripulação`;
      default:
        return "Confira e confirme";
    }
  }

  function addStop() {
    const value = newStop.trim();
    if (!value) return;
    dispatch({
      type: "insertStop",
      index: Math.max(0, draft.stops.length - 1),
      city: value,
      country: null,
    });
    setNewStop("");
  }

  function addInvite() {
    const email = newEmail.trim();
    if (!email || !/.+@.+/.test(email)) return;
    dispatch({ type: "addInvite", email });
    setNewEmail("");
  }

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

  if (!hydrated) return null;

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <div>
          <span>
            Nova viagem · passo {String(step).padStart(2, "0")} de 06 · {current.phase}
          </span>
          <h1>{current.label}</h1>
        </div>
        <button type="button" onClick={() => router.push("/app")}>
          Cancelar ✕
        </button>
      </header>

      <nav className={styles.stepper} aria-label="Passos da criação">
        {STEPS.map((item, index) => {
          const number = index + 1;
          const active = number === step;
          const done = number < step;
          const reachable = number <= step || (number === step + 1 && canAdvance);
          return (
            <button
              key={item.label}
              type="button"
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
              onClick={() => dispatch({ type: "setStep", step: number })}
            >
              <span className={active ? styles.stepActive : done ? styles.stepDone : ""}>
                {String(number).padStart(2, "0")}
              </span>
              <strong>{item.label}</strong>
            </button>
          );
        })}
      </nav>

      <div className={styles.mobileHeader}>
        <div>
          <button
            type="button"
            onClick={() => (step === 1 ? router.push("/app") : dispatch({ type: "prev" }))}
          >
            {step === 1 ? "← Painel" : "← Voltar"}
          </button>
          <span>Passo {String(step).padStart(2, "0")} / 06</span>
          <button type="button" aria-label="Cancelar" onClick={() => router.push("/app")}>
            ✕
          </button>
        </div>
        <div className={styles.mobileTrack} aria-hidden="true">
          {STEPS.map((item, index) => (
            <span key={item.label} className={index + 1 <= step ? styles.mobileTrackOn : ""} />
          ))}
        </div>
        <p>{current.phase}</p>
        <h1>{current.label}</h1>
      </div>

      <div className={styles.body}>
        <section className={styles.stepPanel}>
          {step === 1 ? (
            <StepDestino draft={draft} dispatch={dispatch} />
          ) : step === 2 ? (
            <StepParadas
              routeNodes={routeNodes}
              newStop={newStop}
              setNewStop={setNewStop}
              addStop={addStop}
              dispatch={dispatch}
            />
          ) : step === 3 ? (
            <StepTranslados legs={legs} openLeg={openLeg} setOpenLeg={setOpenLeg} />
          ) : step === 4 ? (
            <StepNome draft={draft} dispatch={dispatch} />
          ) : step === 5 ? (
            <StepTripulacao
              draft={draft}
              newEmail={newEmail}
              setNewEmail={setNewEmail}
              addInvite={addInvite}
              dispatch={dispatch}
            />
          ) : (
            <StepResumo
              draft={draft}
              destination={destination.city || "Destino"}
              cityCount={routeNodes.length}
              definedLegs={definedLegs}
              totalLegs={legs.length}
            />
          )}
        </section>

        <RouteRail routeNodes={routeNodes} definedLegs={definedLegs} totalLegs={legs.length} />
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          onClick={() => (step === 1 ? router.push("/app") : dispatch({ type: "prev" }))}
        >
          {step === 1 ? "← Painel" : "← Voltar"}
        </button>
        <span>{error ?? footerHint()}</span>
        <button
          type="button"
          disabled={pending || (step === 6 ? !canSubmit(draft) : !canAdvance)}
          onClick={() => (step === 6 ? confirm() : dispatch({ type: "next" }))}
        >
          {step === 6 ? (pending ? "Criando…" : "Criar viagem →") : "Continuar →"}
        </button>
      </footer>
    </main>
  );
}

function StepDestino({
  draft,
  dispatch,
}: {
  draft: TripDraft;
  dispatch: Dispatch<Parameters<typeof tripDraftReducer>[1]>;
}) {
  const destination = getDestination(draft);
  return (
    <div className={styles.stepContent}>
      <p>Rota · destino final</p>
      <h2>Para onde vocês vão?</h2>
      <p>
        A última parada é o destino. A rota inteira termina aqui — vocês desenham as paradas no
        caminho no próximo passo.
      </p>
      <label>
        <span>Cidade destino</span>
        <input
          value={destination.city}
          onChange={(event) =>
            dispatch({
              type: "setDestination",
              city: event.target.value,
              country: destination.country,
            })
          }
          placeholder="Orlando"
        />
      </label>
      <label className={styles.shortField}>
        <span>País do destino</span>
        <select
          value={destination.country ?? ""}
          onChange={(event) =>
            dispatch({
              type: "setDestination",
              city: destination.city,
              country: event.target.value || null,
            })
          }
        >
          <option value="">País</option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.notice}>
        <span aria-hidden="true">◷</span>
        <p>
          Parada é cidade — sem aeroporto. O código IATA (GRU, MCO…) entra depois, lá na pesquisa de
          translado.
        </p>
      </div>
    </div>
  );
}

function StepParadas({
  routeNodes,
  newStop,
  setNewStop,
  addStop,
  dispatch,
}: {
  routeNodes: Array<{
    city: string;
    tag: string;
    country: string | null | undefined;
    variant: string;
    id?: string;
    removable?: boolean;
  }>;
  newStop: string;
  setNewStop: (value: string) => void;
  addStop: () => void;
  dispatch: Dispatch<Parameters<typeof tripDraftReducer>[1]>;
}) {
  return (
    <div className={styles.stepContent}>
      <p>Rota · paradas</p>
      <h2>Tracem as paradas</h2>
      <p>
        As cidades na ordem em que vão ficar, da origem ao destino. Cada salto entre duas vira um
        trajeto.
      </p>
      <RouteList routeNodes={routeNodes} dispatch={dispatch} removable />
      <div className={styles.inlineAdd}>
        <input
          value={newStop}
          onChange={(event) => setNewStop(event.target.value)}
          placeholder="Adicionar parada (cidade)"
        />
        <button type="button" onClick={addStop}>
          + Parada
        </button>
      </div>
      <small>A ordem é a sequência. Reordenar por arrasto fica registrado para a V1.</small>
    </div>
  );
}

function StepTranslados({
  legs,
  openLeg,
  setOpenLeg,
}: {
  legs: Leg[];
  openLeg: string | null;
  setOpenLeg: (id: string | null) => void;
}) {
  return (
    <div className={styles.stepContent}>
      <p>Rota · translados</p>
      <h2>Como vencer cada trajeto?</h2>
      <p>
        Defina o modo proposto de cada salto. Os preços vocês pesquisam depois, já dentro da viagem.
      </p>
      <div className={styles.legs}>
        {legs.map((leg) => {
          const transfer = formatTransfer(leg.transfer);
          const open = openLeg === leg.id;
          return (
            <article key={leg.id} className={styles.legCard}>
              <button type="button" onClick={() => setOpenLeg(open ? null : leg.id)}>
                <span>{leg.label}</span>
                <strong>
                  {leg.from} → {leg.to}
                </strong>
                <small>{leg.scope}</small>
                <em className={transfer.defined ? styles.transferSet : ""}>
                  <span aria-hidden="true">{transfer.glyph}</span>
                  {transfer.label}
                </em>
              </button>
              {open ? (
                <div className={styles.transferOptions}>
                  {TRANSFER_OPTIONS.map((option) => (
                    <button
                      key={option.kind}
                      type="button"
                      onClick={() => {
                        leg.setTransfer({
                          kind: option.kind,
                          otherText: option.kind === "other" ? "Outro" : undefined,
                        });
                        setOpenLeg(null);
                      }}
                    >
                      <span aria-hidden="true">{option.glyph}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <div className={styles.notice}>
        <span aria-hidden="true">⊟</span>
        <p>
          Terrestre é conector estrutural da rota. A cotação de translado terrestre chega em breve —
          por ora, só o aéreo recebe pesquisa de preço.
        </p>
      </div>
    </div>
  );
}

function StepNome({
  draft,
  dispatch,
}: {
  draft: TripDraft;
  dispatch: Dispatch<Parameters<typeof tripDraftReducer>[1]>;
}) {
  return (
    <div className={styles.stepContent}>
      <p>Detalhes · nome</p>
      <h2>Batizem a viagem</h2>
      <p>Só um nome para o grupo reconhecer no caderno de bordo. Dá pra mudar quando quiserem.</p>
      <label>
        <span>Nome da viagem</span>
        <input
          value={draft.name}
          onChange={(event) => dispatch({ type: "setName", name: event.target.value })}
          placeholder="Férias em Orlando"
        />
      </label>
      <label>
        <span>Descrição · opcional</span>
        <textarea
          rows={3}
          value={draft.description}
          onChange={(event) =>
            dispatch({ type: "setDescription", description: event.target.value })
          }
          placeholder="Uma linha sobre o plano do grupo…"
        />
      </label>
    </div>
  );
}

function StepTripulacao({
  draft,
  newEmail,
  setNewEmail,
  addInvite,
  dispatch,
}: {
  draft: TripDraft;
  newEmail: string;
  setNewEmail: (value: string) => void;
  addInvite: () => void;
  dispatch: Dispatch<Parameters<typeof tripDraftReducer>[1]>;
}) {
  return (
    <div className={styles.stepContent}>
      <p>Detalhes · tripulação</p>
      <h2>Quem embarca?</h2>
      <p>
        Convidem por e-mail. Cada pessoa pesquisa e marca a própria preferida — a decisão é de cada
        um, sem voto de grupo.
      </p>
      <div className={styles.crewList}>
        <div>
          <span>A</span>
          <strong>Ana Prado · você</strong>
          <small>Organizadora</small>
          <em>Organiza</em>
        </div>
        {draft.invitations.map((invite) => (
          <div key={invite.email}>
            <span>✦</span>
            <strong>{invite.email}</strong>
            <small>Aguardando aceite</small>
            <button
              type="button"
              onClick={() => dispatch({ type: "removeInvite", email: invite.email })}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className={styles.inlineAdd}>
        <input
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          placeholder="email@convidado.com"
        />
        <button type="button" onClick={addInvite}>
          + Convidar
        </button>
      </div>
    </div>
  );
}

function StepResumo({
  draft,
  destination,
  cityCount,
  definedLegs,
  totalLegs,
}: {
  draft: TripDraft;
  destination: string;
  cityCount: number;
  definedLegs: number;
  totalLegs: number;
}) {
  return (
    <div className={styles.stepContent}>
      <p>Confirmar · resumo</p>
      <h2>Tudo pronto para embarcar?</h2>
      <p>Confiram a rota e a tripulação. Criar a viagem leva vocês direto ao painel dela.</p>
      <div className={styles.summaryGrid}>
        <Summary label="Destino final" value={destination} />
        <Summary label="Cidades na rota" value={`${cityCount} cidades`} />
        <Summary label="Trajetos definidos" value={`${definedLegs} de ${totalLegs}`} accent />
        <Summary label="Tripulação" value={`${draft.invitations.length + 1} a bordo`} />
      </div>
      <div className={styles.tripNameCard}>
        <span>Viagem</span>
        <strong>{draft.name.trim() || "Sua viagem"}</strong>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={styles.summaryCard}>
      <span>{label}</span>
      <strong className={accent ? styles.accentText : ""}>{value}</strong>
    </div>
  );
}

function RouteRail({
  routeNodes,
  definedLegs,
  totalLegs,
}: {
  routeNodes: Array<{
    city: string;
    tag: string;
    country: string | null | undefined;
    variant: string;
    id?: string;
    removable?: boolean;
  }>;
  definedLegs: number;
  totalLegs: number;
}) {
  return (
    <aside className={styles.routeRail}>
      <div>
        <span>A rota até aqui</span>
        <span>{routeNodes.length} cidades</span>
      </div>
      <RouteList routeNodes={routeNodes} />
      <footer>
        <span>Translados</span>
        <strong>
          {definedLegs} / {totalLegs}
        </strong>
      </footer>
    </aside>
  );
}

function RouteList({
  routeNodes,
  dispatch,
  removable = false,
}: {
  routeNodes: Array<{
    city: string;
    tag: string;
    country: string | null | undefined;
    variant: string;
    id?: string;
    removable?: boolean;
  }>;
  dispatch?: Dispatch<Parameters<typeof tripDraftReducer>[1]>;
  removable?: boolean;
}) {
  return (
    <ol className={styles.routeList}>
      {routeNodes.map((node) => (
        <li key={`${node.variant}-${node.city}-${node.id ?? ""}`}>
          <span
            className={
              node.variant === "dest"
                ? styles.destDot
                : node.variant === "origin"
                  ? styles.originDot
                  : ""
            }
          >
            {node.variant === "dest" ? "★" : ""}
          </span>
          <strong>{node.city}</strong>
          <small>{node.tag}</small>
          {node.country ? <em>{countryName(node.country)}</em> : null}
          {removable && node.removable && node.id && dispatch ? (
            <RemoveStopButton id={node.id} dispatch={dispatch} />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function RemoveStopButton({
  id,
  dispatch,
}: {
  id: string;
  dispatch: Dispatch<Parameters<typeof tripDraftReducer>[1]>;
}) {
  return (
    <button
      type="button"
      aria-label="Remover parada"
      onClick={() => dispatch({ type: "removeStop", id })}
    >
      ✕
    </button>
  );
}
