"use client";

import { type Dispatch, Fragment } from "react";
import { COUNTRIES } from "@/lib/countries";
import {
  getDestination,
  getMiddleStops,
  type StopDraft,
  type TripDraftAction,
} from "@/lib/trips/draft";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";
import { originLabel } from "./wizard-types";

/** Select de país compacto reutilizado por card de parada. */
function CountrySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | null;
  onChange: (code: string | null) => void;
}) {
  return (
    <label className={styles.miniLabel} htmlFor={id}>
      <span className={styles.label}>País</span>
      <select
        id={id}
        className={styles.miniInput}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">—</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Card de uma parada (meio ou destino). Edita cidade/país **por id** via
 * `setStopLocation` — o destino também tem id, então o mesmo card serve aos dois sem
 * privilegiar a última parada. Definido no módulo (não dentro de `StepParadas`) para
 * não remontar a cada tecla e perder o foco do input.
 */
function StopCard({
  stop,
  kicker,
  accentKicker,
  fixed,
  canUp,
  canDown,
  removable,
  dispatch,
}: {
  stop: StopDraft;
  kicker: string;
  accentKicker?: boolean;
  fixed?: boolean;
  canUp?: boolean;
  canDown?: boolean;
  removable?: boolean;
  dispatch: Dispatch<TripDraftAction>;
}) {
  const cityLabel = stop.city.trim() || "cidade";
  return (
    <div className={`${styles.card} ${fixed ? styles.cardFixed : ""}`}>
      <div className={styles.cardHead}>
        <span className={`${styles.kicker} ${accentKicker ? styles.kickerAccent : ""}`}>
          {kicker}
        </span>
        {removable || canUp !== undefined ? (
          <div className={styles.cardActions}>
            {canUp !== undefined ? (
              <>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled={!canUp}
                  aria-label={`Mover ${cityLabel} para cima`}
                  onClick={() => dispatch({ type: "moveStop", id: stop.id, direction: "up" })}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled={!canDown}
                  aria-label={`Mover ${cityLabel} para baixo`}
                  onClick={() => dispatch({ type: "moveStop", id: stop.id, direction: "down" })}
                >
                  ↓
                </button>
              </>
            ) : null}
            {removable ? (
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={`Remover ${cityLabel}`}
                onClick={() => dispatch({ type: "removeStop", id: stop.id })}
              >
                ×
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <label className={styles.miniLabel} htmlFor={`city-${stop.id}`}>
        <span className={styles.label}>Cidade</span>
        <input
          id={`city-${stop.id}`}
          type="text"
          className={styles.miniInput}
          value={stop.city}
          placeholder="Cidade"
          onChange={(event) =>
            dispatch({
              type: "setStopLocation",
              id: stop.id,
              city: event.target.value,
              country: stop.country,
            })
          }
        />
      </label>

      <div className={styles.cardRow}>
        <CountrySelect
          id={`country-${stop.id}`}
          value={stop.country}
          onChange={(code) =>
            dispatch({ type: "setStopLocation", id: stop.id, city: stop.city, country: code })
          }
        />
        <label className={styles.miniLabel} htmlFor={`arrival-${stop.id}`}>
          <span className={styles.label}>Chegada aproximada</span>
          <input
            id={`arrival-${stop.id}`}
            type="date"
            className={styles.miniInput}
            value={stop.arrivalDate ?? ""}
            onChange={(event) =>
              dispatch({ type: "setStopDate", id: stop.id, date: event.target.value || null })
            }
          />
        </label>
      </div>
    </div>
  );
}

/**
 * Passo 2 — Paradas. Trilha vertical: origem fixa no topo (derivada do Perfil, inv. 6),
 * paradas intermediárias editáveis no meio (inserir/reordenar/remover), destino fixo
 * embaixo. Data de chegada por card; partida aproximada sutil junto da origem.
 */
export function StepParadas({ draft, dispatch, origin }: StepProps) {
  const middle = getMiddleStops(draft);
  const dest = getDestination(draft);
  const lastMiddle = middle.length - 1;

  return (
    <div>
      <p className={styles.eyebrow}>Passo 2 · Paradas</p>
      <h1 className={styles.title}>Tracem a rota, cidade a cidade</h1>
      <p className={styles.lede}>
        A última parada é o destino. Insira cidades entre a origem e o destino, reordene e ajuste as
        datas — tudo aproximado, dá pra mudar depois.
      </p>

      <p className={styles.counterBar}>
        {draft.stops.length} {draft.stops.length === 1 ? "cidade" : "cidades"} na rota
      </p>

      <ul className={styles.trail}>
        {/* Origem fixa */}
        <li className={styles.node}>
          <span className={styles.rail}>
            <span className={`${styles.dot} ${styles.dotOrigin}`} aria-hidden="true" />
            <span className={styles.spine} aria-hidden="true" />
          </span>
          <div className={`${styles.card} ${styles.cardFixed}`}>
            <div className={styles.cardHead}>
              <span className={`${styles.kicker} ${styles.kickerAccent}`}>Origem · Você</span>
            </div>
            <span className={styles.cityName}>{originLabel(origin)}</span>
            <label className={styles.miniLabel} htmlFor="departure">
              <span className={styles.label}>Partida aproximada</span>
              <input
                id="departure"
                type="date"
                className={styles.miniInput}
                value={draft.departureDate ?? ""}
                onChange={(event) =>
                  dispatch({ type: "setDeparture", date: event.target.value || null })
                }
              />
            </label>
          </div>
        </li>

        <li className={styles.insertRow}>
          <span className={styles.rail}>
            <span className={styles.spine} aria-hidden="true" />
          </span>
          <button
            type="button"
            className={styles.insertBtn}
            onClick={() => dispatch({ type: "addStop", index: 0 })}
          >
            + parada aqui
          </button>
        </li>

        {middle.map((stop, i) => (
          <Fragment key={stop.id}>
            <li className={styles.node}>
              <span className={styles.rail}>
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.spine} aria-hidden="true" />
              </span>
              <StopCard
                stop={stop}
                kicker={`Parada ${i + 1}`}
                canUp={i > 0}
                canDown={i < lastMiddle}
                removable
                dispatch={dispatch}
              />
            </li>
            <li className={styles.insertRow}>
              <span className={styles.rail}>
                <span className={styles.spine} aria-hidden="true" />
              </span>
              <button
                type="button"
                className={styles.insertBtn}
                onClick={() => dispatch({ type: "addStop", index: i + 1 })}
              >
                + parada aqui
              </button>
            </li>
          </Fragment>
        ))}

        {/* Destino fixo */}
        <li className={styles.node}>
          <span className={styles.rail}>
            <span className={`${styles.dot} ${styles.dotDest}`} aria-hidden="true" />
          </span>
          <StopCard stop={dest} kicker="Destino final" accentKicker fixed dispatch={dispatch} />
        </li>
      </ul>
    </div>
  );
}
