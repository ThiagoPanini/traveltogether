"use client";

import type { AirportPublic, SegmentMode } from "@traveltogether/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { searchAirportsAction } from "@/app/actions/airports";
import { DateField } from "@/components/date-field";
import { newTripDatesValid } from "@/lib/trips/new-trip";
import { deriveWizardLegs, summarizeWizard, type WizardState } from "@/lib/trips/wizard";
import { createTripFromWizardAction } from "./actions";

// Wizard de cadastro (rodada 0 Espresso). 5 passos de entrada + um fecho que
// celebra ("Viagem criada"), honestos ao domínio (ADR-0018/0020): nome+período,
// origem, paradas (Trajetos DERIVAM daqui), modo binário por Trajeto, Convites
// pendentes. NÃO captura aeroporto — só cidade (mata "Aeroporto de Referência").
// Sem cidade-via, sem "conexão". Movimento "Assinatura" (#168): trilho de
// carimbos, virar-de-passaporte e o carimbo do fecho.

type Phase = "idle" | "submitting" | "error";

interface StopRow {
  key: string;
  city: string;
  arrive: string;
  depart: string;
}

let rowSeq = 0;
const nextKey = () => `row-${rowSeq++}-${Date.now()}`;

// 5 passos de entrada (0–4) + o fecho "Pronto" (5), que não se navega pelo
// "Continuar" — só se alcança ao criar a Viagem. "Criar viagem" mora no rodapé
// do passo Grupo (índice 4).
const STEPS = ["Nome", "Origem", "Roteiro", "Modo", "Grupo", "Pronto"] as const;
const SUBMIT_STEP = 4;
const SUCCESS_STEP = 5;
const MODE_LABEL: Record<SegmentMode, string> = { air: "Aéreo", ground: "Terrestre" };

/** Ícone de modo do salto (aéreo/terrestre) — usado na fita do fecho. */
function ModeHop({ mode }: { mode: SegmentMode }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={MODE_LABEL[mode]}
    >
      {mode === "air" ? (
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
      ) : (
        <>
          <circle cx="6.5" cy="17" r="1.8" />
          <circle cx="17.5" cy="17" r="1.8" />
          <path d="M4 13l1.6-5h9l3 4v5h-1.7M8.3 17h7.4M4 13h12" />
        </>
      )}
    </svg>
  );
}

/** Trilho de carimbos: passo concluído vira selo; rótulo só no passo atual. */
function StampRail({ step }: { step: number }) {
  return (
    <ol className="wiz-rail">
      {STEPS.map((label, i) => {
        const done = i < step;
        const now = i === step;
        return (
          <li key={label} className={`wiz-chip ${now ? "now" : ""} ${done ? "done" : ""}`}>
            <span className="wiz-chip-mark">
              {done ? (
                <span className="wiz-chip-stamp">
                  <svg
                    width={13}
                    height={13}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : (
                <span className="wiz-chip-n">{i + 1}</span>
              )}
            </span>
            {now && <span className="wiz-chip-label">{label}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Campo de cidade com sugestões do dataset — guarda só o nome, nunca o IATA. */
function CityField({
  label,
  placeholder,
  value,
  onPick,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onPick: (city: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<AirportPublic[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const results = await searchAirportsAction(q);
      if (!cancelled) setSuggestions(results);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  return (
    <label className="field wiz-city">
      <span>{label}</span>
      <input
        autoComplete="off"
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onChange={(e) => {
          onPick(e.target.value);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          if (suggestions.length) setOpen(true);
        }}
        placeholder={placeholder}
        value={value}
      />
      {open && suggestions.length > 0 && (
        <ul className="wiz-menu">
          {suggestions.map((a) => (
            <li key={`${a.iata}-${a.name}`}>
              <button
                onMouseDown={() => {
                  onPick(a.city);
                  setOpen(false);
                  setSuggestions([]);
                }}
                type="button"
              >
                <span>{a.city}</span>
                <span className="wiz-menu-sub">{a.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}

export function NewTripForm({ creatorEmail }: { creatorEmail: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [stops, setStops] = useState<StopRow[]>([]);
  const [modes, setModes] = useState<Record<number, SegmentMode>>({});
  const [invites, setInvites] = useState<string[]>([]);
  const [emailDraft, setEmailDraft] = useState("");

  const legs = origin.trim()
    ? deriveWizardLegs(
        origin.trim(),
        stops.map((s) => ({ city: s.city.trim(), arrive: s.arrive, depart: s.depart })),
      )
    : [];

  function addStop() {
    const last = stops[stops.length - 1];
    setStops((prev) => [
      ...prev,
      { key: nextKey(), city: "", arrive: last ? last.depart : start, depart: end },
    ]);
  }
  function updStop(key: string, field: "city" | "arrive" | "depart", val: string) {
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: val } : s)));
  }
  function rmStop(key: string) {
    setStops((prev) => prev.filter((s) => s.key !== key));
  }
  function addEmail() {
    const e = emailDraft.trim();
    if (e && !invites.some((x) => x.toLowerCase() === e.toLowerCase())) {
      setInvites((prev) => [...prev, e]);
    }
    setEmailDraft("");
  }

  const datesValid = newTripDatesValid(
    start,
    end,
    stops.map((s) => ({ arrive: s.arrive, depart: s.depart })),
  );

  // Validação só dos passos de entrada (0–4); o fecho (5) não se navega.
  const stepValid = [
    name.trim().length > 0,
    origin.trim().length > 0,
    Boolean(start) && Boolean(end) && datesValid && stops.every((s) => s.city.trim()),
    true,
    true,
  ];
  const canNext = stepValid[step] ?? true;
  const isSubmitStep = step === SUBMIT_STEP;
  const isSuccess = step === SUCCESS_STEP;

  function buildState(): WizardState {
    return {
      name: name.trim(),
      description: description.trim(),
      origin: origin.trim(),
      start,
      end,
      stops: stops.map((s) => ({ city: s.city.trim(), arrive: s.arrive, depart: s.depart })),
      legModes: legs.map((_, i) => modes[i] ?? "air"),
      inviteEmails: invites,
      creatorEmail,
    };
  }

  async function submit() {
    setPhase("submitting");
    const result = await createTripFromWizardAction(buildState());
    if (result?.ok) {
      // Sucesso: avança ao fecho — o carimbo "Viagem criada" toca no mount.
      setPhase("idle");
      setStep(SUCCESS_STEP);
    } else {
      setPhase("error");
    }
  }

  const summary = isSuccess ? summarizeWizard(buildState()) : null;

  return (
    <div className="wizard">
      <StampRail step={step} />

      {/* virar-de-passaporte: a perspectiva no wrapper dá profundidade real ao
          rotateY do cartão, que remonta (key) a cada passo. */}
      <div className="wiz-flip">
        <div key={step} className="card wiz-card">
          {step === 0 && (
            <div className="wiz-step">
              <span className="kicker">Passo 01</span>
              <h2>Que viagem é essa?</h2>
              <label className="field">
                <span>Nome da viagem</span>
                <input
                  onChange={(e) => setName(e.target.value)}
                  placeholder="EUA Trip do grupo"
                  value={name}
                />
              </label>
              <label className="field">
                <span>Descrição (opcional)</span>
                <textarea
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qual é a história dessa viagem?"
                  rows={2}
                  value={description}
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="wiz-step">
              <span className="kicker">Passo 02</span>
              <h2>De onde o grupo parte?</h2>
              <p className="wiz-hint">A cidade de origem ancora ida e volta do roteiro.</p>
              <CityField
                label="Cidade de origem"
                onPick={setOrigin}
                placeholder="São Paulo"
                value={origin}
              />
            </div>
          )}

          {step === 2 && (
            <div className="wiz-step">
              <span className="kicker">Passo 03</span>
              <h2>O roteiro</h2>
              <div className="form-row cols-2">
                <div className="field">
                  <span>Data de ida</span>
                  <DateField ariaLabel="Data de ida" onChange={setStart} value={start} />
                </div>
                <div className="field">
                  <span>Data de volta</span>
                  <DateField
                    ariaLabel="Data de volta"
                    min={start || undefined}
                    onChange={setEnd}
                    value={end}
                  />
                </div>
              </div>
              <div className="wiz-stops">
                {stops.map((s, idx) => (
                  <div key={s.key} className="wiz-stop">
                    <div className="wiz-stop-head">
                      <span className="kicker">parada {String(idx + 1).padStart(2, "0")}</span>
                      <button
                        className="btn tiny ghost"
                        onClick={() => rmStop(s.key)}
                        type="button"
                      >
                        remover
                      </button>
                    </div>
                    <CityField
                      label="Cidade"
                      onPick={(v) => updStop(s.key, "city", v)}
                      placeholder="Nova York"
                      value={s.city}
                    />
                    <div className="form-row cols-2">
                      <div className="field">
                        <span>Chegada</span>
                        <DateField
                          ariaLabel="Chegada"
                          max={end || undefined}
                          min={start || undefined}
                          onChange={(v) => updStop(s.key, "arrive", v)}
                          value={s.arrive}
                        />
                      </div>
                      <div className="field">
                        <span>Saída</span>
                        <DateField
                          ariaLabel="Saída"
                          max={end || undefined}
                          min={s.arrive || start || undefined}
                          onChange={(v) => updStop(s.key, "depart", v)}
                          value={s.depart}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="btn ghost tiny" onClick={addStop} type="button">
                  + Adicionar parada
                </button>
                <p className="wiz-hint">
                  Os trajetos ({origin.trim() || "origem"} → … → {origin.trim() || "origem"}) saem
                  automaticamente da ordem das paradas.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wiz-step">
              <span className="kicker">Passo 04</span>
              <h2>Como se vai em cada trajeto?</h2>
              <p className="wiz-hint">
                Por ora, só o modo: aéreo ou terrestre. Aeroportos e horários ficam para quando o
                grupo começar a pesquisar passagem.
              </p>
              {legs.length === 0 ? (
                <p className="wiz-empty">
                  Adicione paradas no passo anterior para montar os trajetos.
                </p>
              ) : (
                <div className="wiz-modes">
                  {legs.map((leg, i) => {
                    const mode = modes[i] ?? "air";
                    return (
                      <div key={`${leg.from}-to-${leg.to}`} className="wiz-mode-row">
                        <span className="wiz-mode-leg">
                          {leg.from} → {leg.to}
                        </span>
                        <div className="wiz-toggle">
                          {(["air", "ground"] as const).map((m) => (
                            <button
                              key={m}
                              className={`wiz-toggle-opt ${mode === m ? "on" : ""}`}
                              onClick={() => setModes((prev) => ({ ...prev, [i]: m }))}
                              type="button"
                            >
                              {MODE_LABEL[m]}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="wiz-step">
              <span className="kicker">Passo 05</span>
              <h2>Quem viaja junto?</h2>
              <p className="wiz-hint">
                Convide por e-mail. Cada pessoa recebe um convite pendente e entra ao aceitar — você
                segue como organizador.
              </p>
              <div className="wiz-invite">
                <input
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                  placeholder="amigo@grupo.app"
                  type="email"
                  value={emailDraft}
                />
                <button className="btn ink tiny" onClick={addEmail} type="button">
                  Convidar
                </button>
              </div>
              {invites.length > 0 && (
                <ul className="wiz-invites">
                  {invites.map((e) => (
                    <li key={e}>
                      <span>{e}</span>
                      <button
                        className="btn tiny ghost"
                        onClick={() => setInvites((prev) => prev.filter((x) => x !== e))}
                        type="button"
                      >
                        tirar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isSuccess && summary && (
            <div className="wiz-done">
              <div className="wiz-done-seal">
                <span className="wiz-done-ring" />
                <span className="wiz-done-stamp">Viagem criada</span>
              </div>
              <h2>{name.trim() ? `${name.trim()} está no mapa.` : "Tudo no mapa."}</h2>
              <p className="wiz-done-sub">
                Quando o grupo começar a pesquisar passagem, cada preço registrado fica guardado
                aqui para vocês compararem.
              </p>
              <div className="wiz-done-fita">
                {summary.ribbon.length > 0 && (
                  <div className="wiz-done-ribbon">
                    {summary.ribbon.map((item) =>
                      item.kind === "city" ? (
                        <span key={item.key} className="wiz-done-city">
                          {item.label}
                        </span>
                      ) : (
                        <span key={item.key} className="wiz-done-hop">
                          <ModeHop mode={item.mode} />
                        </span>
                      ),
                    )}
                  </div>
                )}
                <dl className="wiz-done-cols">
                  <div>
                    <dt>período</dt>
                    <dd>{summary.periodLabel}</dd>
                  </div>
                  <div>
                    <dt>no radar</dt>
                    <dd>
                      {summary.legCount} {summary.legCount === 1 ? "trajeto" : "trajetos"}
                    </dd>
                  </div>
                  <div>
                    <dt>grupo</dt>
                    <dd>
                      {summary.inviteCount === 0
                        ? "só você"
                        : `você + ${summary.inviteCount} ${
                            summary.inviteCount === 1 ? "convidado" : "convidados"
                          }`}
                    </dd>
                  </div>
                </dl>
              </div>
              <Link className="btn accent" href="/overview">
                Ir para o Painel
              </Link>
            </div>
          )}
        </div>
      </div>

      {!isSuccess && (
        <div className="wiz-nav">
          <button
            className="btn ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            type="button"
          >
            Voltar
          </button>
          {isSubmitStep ? (
            <button
              className="btn accent"
              disabled={phase === "submitting"}
              onClick={submit}
              type="button"
            >
              {phase === "submitting" ? "Criando…" : "Criar viagem"}
            </button>
          ) : (
            <button
              className="btn accent"
              disabled={!canNext}
              onClick={() => setStep((s) => Math.min(SUBMIT_STEP, s + 1))}
              type="button"
            >
              Continuar
            </button>
          )}
        </div>
      )}

      {phase === "error" && (
        <p className="wiz-hint" role="status" style={{ color: "var(--accent)" }}>
          Não foi possível criar a viagem. Tente de novo.
        </p>
      )}
    </div>
  );
}
