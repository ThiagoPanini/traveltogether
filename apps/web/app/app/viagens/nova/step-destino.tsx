"use client";

import { COUNTRIES } from "@/lib/countries";
import { getDestination, NAME_MAX } from "@/lib/trips/draft";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";

/**
 * Passo 1 — Destino. País via `<select>` (COUNTRIES) + cidade texto livre (ADR-0006;
 * combobox GeoNames é enhancement fora de escopo) + nome da viagem. Grava na parada de
 * destino (a última) e no nome do rascunho.
 */
export function StepDestino({ draft, dispatch }: StepProps) {
  const dest = getDestination(draft);

  return (
    <div>
      <p className={styles.eyebrow}>Passo 1 · Destino</p>
      <h1 className={styles.title}>Para onde o grupo vai?</h1>
      <p className={styles.lede}>
        Escolha o país e a cidade do destino. A origem é a sua — vem do seu Perfil, não da viagem.
      </p>

      <div className={styles.fields}>
        <label className={styles.field} htmlFor="trip-country">
          <span className={styles.label}>País do destino</span>
          <select
            id="trip-country"
            className={styles.select}
            value={dest.country ?? ""}
            onChange={(event) =>
              dispatch({
                type: "setDestination",
                city: dest.city,
                country: event.target.value || null,
              })
            }
          >
            <option value="">Selecione o país</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field} htmlFor="trip-city">
          <span className={styles.label}>Cidade do destino</span>
          <input
            id="trip-city"
            type="text"
            className={styles.input}
            value={dest.city}
            onChange={(event) =>
              dispatch({
                type: "setDestination",
                city: event.target.value,
                country: dest.country,
              })
            }
            placeholder="Ex.: Nova York"
          />
        </label>

        <label className={styles.field} htmlFor="trip-name">
          <span className={styles.label}>Nome da viagem</span>
          <input
            id="trip-name"
            type="text"
            className={styles.input}
            maxLength={NAME_MAX}
            value={draft.name}
            onChange={(event) => dispatch({ type: "setName", name: event.target.value })}
            placeholder="Ex.: Costa Leste"
          />
        </label>
      </div>
    </div>
  );
}
