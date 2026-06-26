"use client";

import { Fragment, useState } from "react";
import type { TransferDraft } from "@/lib/trips/draft";
import { isTransferDefined, TRANSFER_TYPES, transferLabel } from "@/lib/trips/transfers";
import { TransferModal } from "./transfer-modal";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";
import { originLabel } from "./wizard-types";

/** Qual conector está com o modal aberto. */
type OpenLeg = { type: "entry" } | { type: "stop"; id: string; index: number } | null;

function glyphFor(transfer: TransferDraft | null): string | null {
  if (!transfer || transfer.kind === "undecided" || transfer.kind === "other") return null;
  return TRANSFER_TYPES.find((t) => t.kind === transfer.kind)?.glyph ?? null;
}

/**
 * Passo 3 — Translados (intenção; ADR-0009). O conector entre cards começa cinza
 * (indefinido) e clicar abre o modal de tipos. O 1º salto é a ida pessoal do criador
 * (entry_transfer, "sua ida · por pessoa", conta no total). A 1ª parada não tem salto
 * compartilhado — o salto que chega nela é a ponta pessoal.
 */
export function StepTranslados({ draft, dispatch, origin }: StepProps) {
  const [open, setOpen] = useState<OpenLeg>(null);
  const { stops } = draft;
  const total = stops.length; // 1 ida pessoal + (stops.length - 1) saltos compartilhados

  function Connector({
    transfer,
    legLabel,
    endpoints,
    personal,
    onOpen,
  }: {
    transfer: TransferDraft | null;
    legLabel: string;
    endpoints: string;
    personal?: boolean;
    onOpen: () => void;
  }) {
    const defined = isTransferDefined(transfer);
    const glyph = glyphFor(transfer);
    return (
      <li className={styles.connector}>
        <span className={styles.connectorRail}>
          <span
            className={`${styles.connectorLine} ${defined ? styles.connectorLineDefined : ""}`}
            aria-hidden="true"
          />
        </span>
        <button
          type="button"
          className={`${styles.hop} ${defined ? styles.hopDefined : ""} ${personal ? styles.hopPersonal : ""}`}
          onClick={onOpen}
        >
          {glyph ? (
            <span className={styles.hopGlyph} aria-hidden="true">
              {glyph}
            </span>
          ) : null}
          <span className={styles.hopLabel}>
            {defined ? transferLabel(transfer) : "Definir translado"}
          </span>
          <span className={styles.hopMeta}>
            {personal ? `${legLabel} · sua ida · por pessoa` : `${legLabel} · ${endpoints}`}
          </span>
        </button>
      </li>
    );
  }

  return (
    <div>
      <p className={styles.eyebrow}>Passo 3 · Translados</p>
      <h1 className={styles.title}>Como vencer cada salto?</h1>
      <p className={styles.lede}>
        Proponha um translado por trajeto — é só uma sugestão pra semear a conversa. Cada pessoa
        pesquisa e decide a sua depois. Sua ida (de casa até a 1ª parada) é pessoal e conta no
        total.
      </p>

      <ul className={styles.trail}>
        <li className={styles.node}>
          <span className={styles.rail}>
            <span className={`${styles.dot} ${styles.dotOrigin}`} aria-hidden="true" />
          </span>
          <div className={`${styles.card} ${styles.cardFixed}`}>
            <span className={`${styles.kicker} ${styles.kickerAccent}`}>Origem · Você</span>
            <span className={styles.cityName}>{originLabel(origin)}</span>
          </div>
        </li>

        {stops.map((stop, i) => {
          const isDest = i === stops.length - 1;
          const personal = i === 0;
          const transfer = personal ? draft.entryTransfer : stop.desiredTransfer;
          const fromCity = personal ? originLabel(origin) : stops[i - 1].city.trim() || "Parada";
          const toCity = stop.city.trim() || (isDest ? "Destino" : `Parada ${i + 1}`);
          return (
            <Fragment key={stop.id}>
              <Connector
                transfer={transfer}
                legLabel={`Trajeto ${i + 1} de ${total}`}
                endpoints={`${fromCity} → ${toCity}`}
                personal={personal}
                onOpen={() =>
                  setOpen(personal ? { type: "entry" } : { type: "stop", id: stop.id, index: i })
                }
              />
              <li className={styles.node}>
                <span className={styles.rail}>
                  <span
                    className={`${styles.dot} ${isDest ? styles.dotDest : ""}`}
                    aria-hidden="true"
                  />
                </span>
                <div className={`${styles.card} ${styles.cardFixed}`}>
                  <span className={styles.kicker}>
                    {isDest ? "Destino final" : `Parada ${i + 1}`}
                  </span>
                  <span
                    className={`${styles.cityName} ${stop.city.trim() ? "" : styles.cityMuted}`}
                  >
                    {toCity}
                  </span>
                </div>
              </li>
            </Fragment>
          );
        })}
      </ul>

      {open ? (
        <TransferModal
          legLabel={
            open.type === "entry"
              ? `Trajeto 1 de ${total}`
              : `Trajeto ${open.index + 1} de ${total}`
          }
          endpoints={
            open.type === "entry"
              ? `${originLabel(origin)} → ${stops[0].city.trim() || "1ª parada"}`
              : `${stops[open.index - 1].city.trim() || "Parada"} → ${stops[open.index].city.trim() || "Parada"}`
          }
          current={open.type === "entry" ? draft.entryTransfer : stops[open.index].desiredTransfer}
          onSelect={(transfer) => {
            if (open.type === "entry") {
              dispatch({ type: "setEntryTransfer", transfer });
            } else {
              dispatch({ type: "setStopTransfer", id: open.id, transfer });
            }
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
