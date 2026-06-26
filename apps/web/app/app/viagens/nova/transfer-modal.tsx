"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TransferDraft } from "@/lib/trips/draft";
import { TRANSFER_TYPES } from "@/lib/trips/transfers";
import styles from "./wizard.module.css";

type TransferModalProps = {
  /** Rótulo do trajeto, ex. "Trajeto 2 de 4". */
  legLabel: string;
  /** Pontas do salto, ex. "São Paulo → Roma". */
  endpoints: string;
  current: TransferDraft | null;
  onSelect: (transfer: TransferDraft) => void;
  onClose: () => void;
};

/**
 * Modal de translado (passo 3 — ADR-0009). Grade de tipos concretos + "outro" (texto
 * livre) + "em discussão". Copy honesta: o que é cotável vira Pesquisa de preço
 * depois; a pé / carro próprio são só conectores. Fecha no Esc e no clique fora.
 */
export function TransferModal({
  legLabel,
  endpoints,
  current,
  onSelect,
  onClose,
}: TransferModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const [otherText, setOtherText] = useState(
    current?.kind === "other" ? (current.otherText ?? "") : "",
  );

  // Foco preso ao diálogo (a11y): foca o 1º elemento ao abrir, prende Tab/Shift+Tab
  // entre o 1º e o último focáveis, fecha no Esc e devolve o foco ao gatilho ao fechar.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = (): HTMLElement[] =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusables()[0]?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={styles.overlay}>
      <button type="button" className={styles.backdrop} aria-label="Fechar" onClick={onClose} />
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div>
          <p className={styles.modalKicker}>{legLabel}</p>
          <h2 className={styles.modalTitle} id={titleId}>
            {endpoints}
          </h2>
        </div>

        <div className={styles.grid}>
          {TRANSFER_TYPES.map((type) => (
            <button
              key={type.kind}
              type="button"
              className={`${styles.typeBtn} ${current?.kind === type.kind ? styles.typeBtnActive : ""}`}
              onClick={() => onSelect({ kind: type.kind })}
            >
              <span className={styles.typeGlyph} aria-hidden="true">
                {type.glyph}
              </span>
              <span className={styles.typeName}>{type.label}</span>
              <span className={styles.typeNote}>
                {type.quotable ? "cotável depois" : "só conector"}
              </span>
            </button>
          ))}
        </div>

        <label className={styles.field}>
          <span className={styles.label}>+ outro tipo</span>
          <div className={styles.inviteForm}>
            <input
              type="text"
              className={styles.input}
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              placeholder="Ex.: balsa, carona"
            />
            <button
              type="button"
              className={styles.secondary}
              disabled={!otherText.trim()}
              onClick={() => onSelect({ kind: "other", otherText: otherText.trim() })}
            >
              Usar
            </button>
          </div>
        </label>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.ghostWide}
            onClick={() => onSelect({ kind: "undecided" })}
          >
            Ainda em discussão
          </button>
          <button type="button" className={styles.ghostWide} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
