"use client";

import type { AirportPublic, SegmentMode } from "@traveltogether/types";
import { useEffect, useRef, useState } from "react";

import { searchAirportsAction } from "@/app/actions/airports";
import { DateField } from "@/components/date-field";
import { newTripDatesValid } from "@/lib/trips/new-trip";
import { deriveWizardLegs, type WizardState } from "@/lib/trips/wizard";
import { createTripFromWizardAction } from "./actions";

// Wizard de cadastro (rodada 0 Espresso). 6 passos honestos ao domínio
// (ADR-0018/0020): nome+período, origem, paradas (Trajetos DERIVAM daqui),
// modo binário por Trajeto, Convites pendentes, revisão. NÃO captura aeroporto —
// só cidade (mata "Aeroporto de Referência"). Sem cidade-via, sem "conexão".

type Phase = "idle" | "submitting" | "error";

interface StopRow {
  key: string;
  city: string;
  arrive: string;
  depart: string;
}

let rowSeq = 0;
const nextKey = () => `row-${rowSeq++}-${Date.now()}`;

const STEPS = ["Nome", "Origem", "Roteiro", "Modo", "Grupo", "Revisão"] as const;
const MODE_LABEL: Record<SegmentMode, string> = { air: "Aéreo", ground: "Terrestre" };

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

  const stepValid = [
    name.trim().length > 0,
    origin.trim().length > 0,
    Boolean(start) && Boolean(end) && datesValid && stops.every((s) => s.city.trim()),
    true,
    true,
    true,
  ];
  const canNext = stepValid[step];
  const isLast = step === STEPS.length - 1;

  async function submit() {
    setPhase("submitting");
    const state: WizardState = {
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
    const result = await createTripFromWizardAction(state);
    // Sucesso redireciona no servidor; só caímos aqui em falha.
    if (result === null) setPhase("error");
  }

  return (
    <div className="wizard">
      <ol className="wiz-rail">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`wiz-pip ${i === step ? "now" : ""} ${i < step ? "done" : ""}`}
          >
            <span className="wiz-pip-n">{String(i + 1).padStart(2, "0")}</span>
            <span className="wiz-pip-l">{label}</span>
          </li>
        ))}
      </ol>

      <div className="card wiz-card">
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
                    <button className="btn tiny ghost" onClick={() => rmStop(s.key)} type="button">
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

        {step === 5 && (
          <div className="wiz-step">
            <span className="kicker">Passo 06</span>
            <h2>Tudo pronto?</h2>
            <dl className="wiz-review">
              <div>
                <dt>Viagem</dt>
                <dd>{name.trim() || "—"}</dd>
              </div>
              <div>
                <dt>Roteiro</dt>
                <dd>
                  {legs.map((l) => l.from).join(" → ") + (legs.length ? ` → ${origin}` : "—")}
                </dd>
              </div>
              <div>
                <dt>Trajetos</dt>
                <dd>
                  {legs.length} no radar ·{" "}
                  {legs.map((_, i) => MODE_LABEL[modes[i] ?? "air"]).join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt>Convites</dt>
                <dd>{invites.length ? invites.join(", ") : "só você por enquanto"}</dd>
              </div>
            </dl>
            <p className="wiz-hint">
              Ao criar, a viagem abre no Painel. De lá o grupo registra as pesquisas de passagem —
              cada preço fica guardado para comparar.
            </p>
          </div>
        )}

        <div className="wiz-nav">
          <button
            className="btn ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            type="button"
          >
            Voltar
          </button>
          {isLast ? (
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
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              type="button"
            >
              Continuar
            </button>
          )}
        </div>

        {phase === "error" && (
          <p className="wiz-hint" role="status" style={{ color: "var(--orange)" }}>
            Não foi possível criar a viagem. Tente de novo.
          </p>
        )}
      </div>
    </div>
  );
}
