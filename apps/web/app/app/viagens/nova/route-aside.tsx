"use client";

import { MapPin } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { type CityEntry, findCity } from "@/lib/geo/cities";
import type { StopDraft, TransferDraft } from "@/lib/trips/draft";
import { isTransferDefined } from "@/lib/trips/transfers";
import { type MapEdge, type MapNode, RouteMap } from "./route-map";
import { TransferIcon } from "./transfer-icons";
import styles from "./wizard.module.css";
import type { Origin } from "./wizard-types";
import { originLabel } from "./wizard-types";

type RouteAsideProps = {
  origin: Origin;
  stops: StopDraft[];
  entryTransfer: TransferDraft | null;
  caption: string;
  plotOrigin?: boolean;
};

/** Nós/arestas plotáveis: só cidades reconhecidas no dataset GeoNames. */
function toMap(
  origin: CityEntry | null,
  stops: StopDraft[],
  entryTransfer: TransferDraft | null,
): { nodes: MapNode[]; edges: MapEdge[] } {
  const lastIndex = stops.length - 1;
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const positions: number[] = [];

  if (origin) {
    nodes.push({ lat: origin.lat, lng: origin.lng, label: origin.name, kind: "origin" });
    positions.push(-1);
  }

  stops.forEach((stop, i) => {
    if (stop.lat == null || stop.lng == null) return;
    const idx = nodes.length;
    nodes.push({
      lat: stop.lat,
      lng: stop.lng,
      label: stop.city.trim() || "—",
      kind: i === lastIndex ? "dest" : "stop",
    });
    const previousPosition = positions.at(-1);
    if (idx > 0 && previousPosition != null && i - previousPosition === 1) {
      const hop = i === 0 ? entryTransfer : stop.desiredTransfer;
      edges.push({ from: idx - 1, to: idx, defined: isTransferDefined(hop) });
    }
    positions.push(i);
  });
  return { nodes, edges };
}

/**
 * Painel lateral dos passos 1-2 — a "rota de bordo". Mostra o mapa esquemático
 * (ADR-0010) desde o globo vazio; a coluna vertical origem → paradas → destino é o
 * **fallback honesto** (e o que aparece em SSR/jsdom ou se o mapa falhar).
 */
export function RouteAside({
  origin,
  stops,
  entryTransfer,
  caption,
  plotOrigin = false,
}: RouteAsideProps) {
  const [originMatch, setOriginMatch] = useState<CityEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOriginMatch(null);
    if (!plotOrigin || !origin.city?.trim() || !origin.country) return;
    void findCity(origin.country, origin.city)
      .then((match) => {
        if (!cancelled) setOriginMatch(match);
      })
      .catch(() => {
        if (!cancelled) setOriginMatch(null);
      });
    return () => {
      cancelled = true;
    };
  }, [origin.city, origin.country, plotOrigin]);

  const lastIndex = stops.length - 1;
  const { nodes, edges } = toMap(originMatch, stops, entryTransfer);
  const dest = stops[lastIndex];
  // Passo 1 coreografa país → cidade; passo 2 abre a jornada inteira no mundo.
  const focus = !plotOrigin
    ? dest?.lat != null && dest.lng != null
      ? {
          countryCode: dest.country,
          coords: { lat: dest.lat, lng: dest.lng },
          scale: 5,
        }
      : dest?.country
        ? { countryCode: dest.country }
        : undefined
    : nodes.length === 1
      ? { coords: { lat: nodes[0].lat, lng: nodes[0].lng }, scale: 5 }
      : undefined;

  const journey = (
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
  );

  return (
    <aside className={styles.aside}>
      <span className={styles.asideCaption}>
        <MapPin size={12} strokeWidth={1.5} aria-hidden="true" /> {caption}
      </span>
      <RouteMap focus={focus} nodes={nodes} edges={edges} fallback={journey} />
    </aside>
  );
}
