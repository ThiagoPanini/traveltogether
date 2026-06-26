"use client";

import { MapPin } from "lucide-react";
import { Fragment } from "react";
import type { StopDraft, TransferDraft } from "@/lib/trips/draft";
import { TransferIcon } from "./transfer-icons";
import styles from "./wizard.module.css";
import type { Origin } from "./wizard-types";
import { originLabel } from "./wizard-types";

type RouteAsideProps = {
  origin: Origin;
  stops: StopDraft[];
  entryTransfer: TransferDraft | null;
  caption: string;
};

/**
 * Painel lateral dos passos 1-2 — a "rota de bordo": origem → paradas → destino numa
 * coluna vertical, com o ícone do modo em cada salto. É o **stand-in do mapa** (o mapa
 * real entra no PR seguinte atrás do mesmo seam; esta coluna vira o fallback honesto).
 */
export function RouteAside({ origin, stops, entryTransfer, caption }: RouteAsideProps) {
  const lastIndex = stops.length - 1;
  return (
    <aside className={styles.aside}>
      <span className={styles.asideCaption}>
        <MapPin size={12} strokeWidth={1.5} aria-hidden="true" /> {caption}
      </span>
      <div className={styles.asideJourney}>
        <div className={styles.asideNode}>
          <span className={`${styles.asideDot} ${styles.asideDotOrigin}`} aria-hidden="true" />
          <span className={styles.asideNodeBody}>
            <span className={styles.asideCity}>{originLabel(origin)}</span>
            <span className={styles.asideTag}>Origem · você</span>
          </span>
        </div>
        {stops.map((stop, i) => {
          const hop = i === 0 ? entryTransfer : stop.desiredTransfer;
          const isDest = i === lastIndex;
          return (
            <Fragment key={stop.id}>
              <span className={styles.asideConn} aria-hidden="true">
                <TransferIcon transfer={hop} size={14} />
              </span>
              <div className={styles.asideNode}>
                <span
                  className={`${styles.asideDot} ${isDest ? styles.asideDotDest : ""}`}
                  aria-hidden="true"
                />
                <span className={styles.asideNodeBody}>
                  <span className={styles.asideCity}>{stop.city.trim() || "—"}</span>
                  <span className={styles.asideTag}>
                    {isDest ? "Destino final" : `Parada ${i + 1}`}
                  </span>
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </aside>
  );
}
