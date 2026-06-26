"use client";

import { Plane } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { getDestination } from "@/lib/trips/draft";
import { CityPicker } from "./city-picker";
import { RouteAside } from "./route-aside";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";

function countryName(code: string | null): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? "";
}

/**
 * Passo 1 — Destino. País (combobox que filtra por nome) → cidade **gated** pelo país,
 * reusando o seam `searchCities` (ADR-0006) com escape hatch. Grava na parada de
 * destino (a última). O nome da viagem saiu daqui — agora mora no passo 4 (Identidade).
 */
export function StepDestino({ draft, dispatch, origin }: StepProps) {
  const dest = getDestination(draft);
  const city = dest.city.trim();

  return (
    <div className={styles.split}>
      <div className={styles.splitLeft}>
        <header className={styles.sectionHead}>
          <p className={styles.eyebrow}>Passo 01 · Destino</p>
          <h1 className={styles.title}>Qual o destino final da viagem?</h1>
          <p className={styles.lede}>
            Selecione o país e a cidade final dessa viagem. Ao longo das próximas etapas, novas
            opções serão mostradas para customização da viagem.
          </p>
        </header>

        <div className={styles.fields}>
          <CityPicker
            country={dest.country}
            city={dest.city}
            onCountry={(code) => dispatch({ type: "setDestination", city: "", country: code })}
            onCity={(value) =>
              dispatch({ type: "setDestination", city: value, country: dest.country })
            }
            countryLabel="País do destino"
            cityLabel="Cidade do destino"
            countryPlaceholder="Buscar país"
            cityPlaceholder="Buscar cidade no destino"
          />
        </div>

        {city ? (
          <div className={styles.destCard}>
            <Plane className={styles.destCardIcon} size={22} strokeWidth={1.5} aria-hidden="true" />
            <span className={styles.destCardBody}>
              <span className={styles.destCardCity}>{city}</span>
              <span className={styles.destCardMeta}>
                Destino final · {countryName(dest.country) || "—"}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <RouteAside
        origin={origin}
        stops={draft.stops}
        entryTransfer={draft.entryTransfer}
        caption={city || "Mundo todo"}
      />
    </div>
  );
}
