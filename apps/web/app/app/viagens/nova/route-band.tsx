"use client";

import { Fragment } from "react";
import type { StopDraft, TransferDraft } from "@/lib/trips/draft";
import { isTransferDefined } from "@/lib/trips/transfers";
import { TransferIcon } from "./transfer-icons";
import styles from "./wizard.module.css";
import type { Origin } from "./wizard-types";
import { originLabel } from "./wizard-types";

type RouteBandProps = {
  origin: Origin;
  stops: StopDraft[];
  entryTransfer: TransferDraft | null;
  /** Anima a entrada (cross-fade/scale) — usado no passo 4. */
  animate?: boolean;
};

/**
 * Faixa-itinerário horizontal (modo referência) — origem → paradas → destino, com o
 * **ícone do modo** em cada salto e o salto pintado em terracota quando o translado
 * está definido (passos 4 e 6). Origem em verde, destino em terracota. A origem é
 * derivada do Perfil (inv. 6). A animação respeita `prefers-reduced-motion` (no CSS).
 */
export function RouteBand({ origin, stops, entryTransfer, animate = false }: RouteBandProps) {
  const lastIndex = stops.length - 1;
  return (
    <div className={`${styles.band} ${animate ? styles.bandReveal : ""}`}>
      <div className={styles.bandStop}>
        <span className={styles.bandKicker}>Origem</span>
        <span className={`${styles.bandDot} ${styles.bandDotOrigin}`} aria-hidden="true" />
        <span className={styles.bandCity}>{originLabel(origin)}</span>
      </div>

      {stops.map((stop, i) => {
        // O salto que chega nesta parada: a 1ª é a ida pessoal (entryTransfer).
        const hop = i === 0 ? entryTransfer : stop.desiredTransfer;
        const isDest = i === lastIndex;
        const defined = isTransferDefined(hop);
        return (
          <Fragment key={stop.id}>
            <div className={styles.bandLink}>
              <span
                className={`${styles.bandLinkLine} ${defined ? styles.bandLinkDefined : ""}`}
                aria-hidden="true"
              />
              <span
                className={`${styles.bandIcon} ${defined ? styles.bandIconDefined : ""}`}
                aria-hidden="true"
              >
                <TransferIcon transfer={hop} size={14} />
              </span>
              <span
                className={`${styles.bandLinkLine} ${defined ? styles.bandLinkDefined : ""}`}
                aria-hidden="true"
              />
            </div>
            <div className={styles.bandStop}>
              <span className={styles.bandKicker}>{isDest ? "Destino" : `Parada ${i + 1}`}</span>
              <span
                className={`${styles.bandDot} ${isDest ? styles.bandDotDest : ""}`}
                aria-hidden="true"
              />
              <span className={styles.bandCity}>{stop.city.trim() || "—"}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
