"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import styles from "./wizard.module.css";

/** Nó plotável no mapa — só entra quem tem coords (cidade do dataset). */
export type MapNode = {
  lat: number;
  lng: number;
  label: string;
  kind: "origin" | "stop" | "dest";
};

/** Aresta entre dois nós (índices em `nodes`). `defined` = translado já escolhido. */
export type MapEdge = { from: number; to: number; defined: boolean };

/** Para onde o mapa olha: país (zoom na região) ou um ponto, senão mundo todo. */
export type MapFocus = {
  countryCode?: string | null;
  coords?: { lat: number; lng: number } | null;
  scale?: number;
};

type RouteMapProps = {
  focus?: MapFocus;
  nodes: MapNode[];
  edges?: MapEdge[];
  /** Conteúdo honesto exibido quando não há coords ou o mapa não pôde carregar. */
  fallback: ReactNode;
};

type VectorMap = {
  addLines: (lines: Array<{ from: string; to: string }>) => void;
  addMarkers: (markers: Array<{ name: string; coords: [number, number] }>) => void;
  coordsToPoint: (lat: number, lng: number) => { x: number; y: number } | null;
  destroy: () => void;
  removeLines: () => void;
  removeMarkers: () => void;
  reset: () => void;
  setFocus: (focus: {
    regions?: string[];
    coords?: [number, number];
    scale?: number;
    animate: boolean;
  }) => void;
};

/**
 * Costura **library-agnostic** do mapa esquemático (ADR-0010). A UI fala em
 * `focus`/`nodes`/`edges`; a implementação (hoje jsVectorMap) fica isolada aqui e
 * pode ser trocada sem tocar os passos.
 *
 * Carregamento é **client-only**: jsVectorMap entra por `import()` dinâmico dentro do
 * effect, só quando o container tem layout (`clientWidth > 0`) — em SSR e em jsdom
 * isso é 0, então o `fallback` honesto (a rota vertical) permanece. Coords são
 * client-only e nunca trafegam no payload (ADR-0011).
 */
export function RouteMap({ focus, nodes, edges = [], fallback }: RouteMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<VectorMap | null>(null);
  const nodesRef = useRef(nodes);
  const pinRefs = useRef(new Map<number, HTMLDivElement>());
  const animationRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const focusCountry = focus?.countryCode;
  const focusLat = focus?.coords?.lat;
  const focusLng = focus?.coords?.lng;
  const focusScale = focus?.scale;
  nodesRef.current = nodes;

  const positionPins = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    nodesRef.current.forEach((node, index) => {
      const pin = pinRefs.current.get(index);
      if (!pin) return;
      const point = map.coordsToPoint(node.lat, node.lng);
      if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
        pin.style.left = `${point.x}px`;
        pin.style.top = `${point.y}px`;
        pin.style.opacity = "1";
      } else {
        pin.style.opacity = "0";
      }
    });
  }, []);

  const syncPinsDuringFocus = useCallback(() => {
    if (typeof window.requestAnimationFrame !== "function") {
      positionPins();
      return;
    }
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
    }
    const startedAt = performance.now();
    const sync = (now: number) => {
      positionPins();
      if (now - startedAt < 800) {
        animationRef.current = window.requestAnimationFrame(sync);
      }
    };
    animationRef.current = window.requestAnimationFrame(sync);
  }, [positionPins]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // Sem layout (SSR/jsdom) → nunca carrega a lib; mantém o fallback.
    if (!host.clientWidth) return;

    let cancelled = false;
    let map: VectorMap | null = null;

    (async () => {
      try {
        const { default: JsVectorMap } = await import("jsvectormap");
        // O mapa-mundi é um script que registra via global `jsVectorMap` (setado no
        // import acima) — por isso vem depois, e nesta ordem.
        await import("jsvectormap/dist/maps/world.js");
        await import("jsvectormap/dist/jsvectormap.css");
        if (cancelled) return;

        const cs = getComputedStyle(host);
        const cssVar = (name: string, fallbackValue: string) =>
          cs.getPropertyValue(name).trim() || fallbackValue;
        const accent = cssVar("--accent", "currentColor");
        const land = cssVar("--line-muted", "currentColor");
        const sea = cssVar("--bg-canvas", "transparent");

        map = new JsVectorMap({
          selector: host,
          map: "world",
          backgroundColor: "transparent",
          zoomButtons: false,
          zoomOnScroll: false,
          showTooltip: false,
          regionStyle: {
            initial: { fill: land, stroke: sea, strokeWidth: 0.5, fillOpacity: 1 },
          },
          markers: [],
          markerStyle: {
            initial: { fill: "transparent", stroke: "transparent", r: 1 },
          },
          lines: [],
          lineStyle: { stroke: accent, strokeWidth: 1.5, strokeLinecap: "round" },
          // @ts-expect-error jsVectorMap 1.7 executa o callback, mas o tipo JvmOptions o omite.
          onViewportChange: positionPins,
        }) as VectorMap;

        mapRef.current = map;
        setActive(true);
      } catch {
        // Falhou (lib, jsdom, sem WebGL…) → fallback honesto permanece.
        setActive(false);
      }
    })();

    return () => {
      cancelled = true;
      setActive(false);
      mapRef.current = null;
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
      try {
        map?.destroy();
      } catch {
        // destruição best-effort
      }
    };
  }, [positionPins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!active || !map) return;
    const host = hostRef.current;
    host?.querySelectorAll(`.${styles.countryOutline}`).forEach((region) => {
      region.classList.remove(styles.countryOutline);
    });
    if (focusCountry) {
      const country = Array.from(host?.querySelectorAll("path[data-code]") ?? []).find(
        (region) => region.getAttribute("data-code") === focusCountry,
      );
      country?.classList.add(styles.countryOutline);
    }

    if (focusLat != null && focusLng != null) {
      map.setFocus({
        coords: [focusLat, focusLng],
        scale: focusScale ?? 4,
        animate: true,
      });
      syncPinsDuringFocus();
    } else if (focusCountry) {
      map.setFocus({ regions: [focusCountry], animate: true });
      syncPinsDuringFocus();
    } else {
      map.reset();
      positionPins();
    }
  }, [active, focusCountry, focusLat, focusLng, focusScale, positionPins, syncPinsDuringFocus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!active || !map) return;
    map.removeLines();
    map.removeMarkers();
    if (nodes.length > 0) {
      map.addMarkers(
        nodes.map((node, index) => ({
          name: String(index),
          coords: [node.lat, node.lng],
        })),
      );
    }
    if (edges.length > 0) {
      map.addLines(
        edges.map((edge) => ({
          from: String(edge.from),
          to: String(edge.to),
        })),
      );
    }
    positionPins();
  }, [active, edges, nodes, positionPins]);

  return (
    <div className={styles.mapWrap} role="img" aria-label="Mapa esquemático da rota">
      <div ref={hostRef} className={styles.mapCanvas} aria-hidden="true" />
      <div className={styles.mapPins} aria-hidden="true">
        {nodes.map((node, index) => (
          <div
            key={`${node.kind}-${node.label}-${node.lat}-${node.lng}`}
            ref={(element) => {
              if (element) pinRefs.current.set(index, element);
              else pinRefs.current.delete(index);
            }}
            className={styles.mapPin}
          >
            <span className={styles.mapPinTag}>{node.label}</span>
            <span
              className={`${styles.mapPinHead} ${
                node.kind === "origin"
                  ? styles.mapPinHeadOrigin
                  : node.kind === "dest"
                    ? styles.mapPinHeadDest
                    : ""
              }`}
            />
            <span
              className={`${styles.mapPinStem} ${
                node.kind === "origin" ? styles.mapPinStemOrigin : ""
              }`}
            />
          </div>
        ))}
      </div>
      {/* Fallback fica por baixo até o mapa montar — e reaparece se ele falhar. */}
      <div className={active ? styles.mapFallbackHidden : styles.mapFallback}>{fallback}</div>
    </div>
  );
}
