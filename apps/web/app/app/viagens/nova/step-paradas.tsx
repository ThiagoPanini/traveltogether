"use client";

import { Plus, X } from "lucide-react";
import { type Dispatch, Fragment, useState } from "react";
import { getDestination, type TripDraftAction } from "@/lib/trips/draft";
import { CityPicker } from "./city-picker";
import { RouteAside } from "./route-aside";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";
import { originLabel } from "./wizard-types";

/** Cartão de cidade na trilha (display-only — sem editar/reordenar; só remover). */
function NodeCard({
  city,
  tag,
  variant,
  onRemove,
}: {
  city: string;
  tag: string;
  variant: "origin" | "stop" | "dest";
  onRemove?: () => void;
}) {
  const label = city.trim() || "—";
  return (
    <div className={`${styles.node} ${variant === "dest" ? styles.nodeDest : ""}`}>
      <span className={`${styles.nodeDot} ${styles[`nodeDot_${variant}`]}`} aria-hidden="true" />
      <span className={styles.nodeBody}>
        <span className={styles.nodeCity}>{label}</span>
        <span className={`${styles.nodeTag} ${styles[`nodeTag_${variant}`]}`}>{tag}</span>
      </span>
      {onRemove ? (
        <button
          type="button"
          className={styles.nodeRemove}
          aria-label={`Remover ${label}`}
          onClick={onRemove}
        >
          <X size={13} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/** Gap entre dois pontos: "+" circular que abre a busca de cidade inline. */
function Gap({
  index,
  open,
  onOpen,
  onClose,
  dispatch,
}: {
  index: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  dispatch: Dispatch<TripDraftAction>;
}) {
  const [country, setCountry] = useState<string | null>(null);

  if (!open) {
    return (
      <div className={styles.gap}>
        <span className={styles.gapSeg} aria-hidden="true" />
        <button
          type="button"
          className={styles.gapAdd}
          aria-label="Adicionar parada neste ponto"
          onClick={onOpen}
        >
          <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <span className={styles.gapSeg} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={styles.gap}>
      <span className={styles.gapSeg} aria-hidden="true" />
      <div className={styles.gapPanel}>
        <span className={styles.gapPanelLabel}>Adicionar parada neste ponto</span>
        <div className={styles.gapPanelFields}>
          <CityPicker
            country={country}
            city=""
            onCountry={setCountry}
            onCity={(value, coords) => {
              // O combobox emite "" a cada tecla (limpa seleção); só encaixa a parada
              // numa escolha real (opção do dataset ou texto livre via escape hatch).
              if (!value.trim()) return;
              dispatch({
                type: "insertStop",
                index,
                city: value,
                country,
                lat: coords?.lat ?? null,
                lng: coords?.lng ?? null,
              });
              onClose();
            }}
          />
        </div>
        <button type="button" className={styles.gapCancel} onClick={onClose}>
          Cancelar
        </button>
      </div>
      <span className={styles.gapSeg} aria-hidden="true" />
    </div>
  );
}

/**
 * Passo 2 — Paradas. Trilha vertical: origem fixa no topo (derivada do Perfil, inv. 6),
 * destino fixo embaixo, paradas do meio entre eles. O "+" entre dois pontos abre a
 * busca de cidade e encaixa a parada já preenchida; cards são display-only (só remover).
 * Datas ficam escondidas nesta tela (o modelo as preserva — `arrivalDate`/`departureDate`).
 */
export function StepParadas({ draft, dispatch, origin }: StepProps) {
  const [openGap, setOpenGap] = useState<number | null>(null);
  const dest = getDestination(draft);
  const middleCount = draft.stops.length - 1;

  return (
    <div className={styles.split}>
      <div className={styles.splitLeft}>
        <header className={styles.sectionHead}>
          <p className={styles.eyebrow}>Passo 02 · Paradas</p>
          <h1 className={styles.title}>
            Vão parar em algum lugar até {dest.city.trim() || "o destino"}?
          </h1>
          <p className={styles.lede}>
            A origem já vem do seu Perfil — não precisam informar. Toquem no + entre dois pontos
            para encaixar uma parada; a rota cresce daí.
          </p>
        </header>

        <div className={styles.journey}>
          <NodeCard city={originLabel(origin)} tag="Origem · você" variant="origin" />
          {draft.stops.map((stop, i) => {
            const isDest = i === draft.stops.length - 1;
            return (
              <Fragment key={stop.id}>
                <Gap
                  index={i}
                  open={openGap === i}
                  onOpen={() => setOpenGap(i)}
                  onClose={() => setOpenGap(null)}
                  dispatch={dispatch}
                />
                <NodeCard
                  city={stop.city}
                  tag={isDest ? "Destino final" : `Parada ${i}`}
                  variant={isDest ? "dest" : "stop"}
                  onRemove={
                    isDest ? undefined : () => dispatch({ type: "removeStop", id: stop.id })
                  }
                />
              </Fragment>
            );
          })}
        </div>

        <p className={styles.journeyNote}>
          {middleCount === 0
            ? "Sem paradas, vocês vão direto da origem ao destino — e podem seguir assim. Use o + para conhecer cidades no caminho."
            : `${middleCount} ${middleCount === 1 ? "parada no meio" : "paradas no meio"} · use o + onde quiser para inserir mais.`}
        </p>
      </div>

      <RouteAside
        origin={origin}
        stops={draft.stops}
        entryTransfer={draft.entryTransfer}
        caption={draft.stops.length > 1 ? "Rota no mapa" : dest.city.trim() || "Mundo todo"}
        plotOrigin
      />
    </div>
  );
}
