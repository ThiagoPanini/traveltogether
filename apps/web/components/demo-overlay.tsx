"use client";

import { useEffect } from "react";

import { EXAMPLE_ACTIVE_PANEL } from "@/lib/demo/example-active-panel";
import { Icon } from "./atlas";
import { PanelView } from "./panel-view";

// Overlay "Ver exemplo" da Home (#137). Mostra o Painel REAL em modo
// somente-leitura sobre a fixture de exemplo (sem login, sem API, sem seed).
// Toda interação do Painel é inerte: `readOnly` não emite navegação e a camada
// `pointer-events: none` desliga cliques. Fecha por X, Esc e clique no backdrop.
//
// O backdrop é um <button> de verdade (acessível por teclado, sem suppressions
// de lint). O CTA "Entrar para usar" é uma âncora normal para `/login`
// (navegação cheia, proposital). O Painel em si não leva a lugar nenhum.
export function DemoOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay">
      <button
        aria-label="Fechar prévia"
        className="overlay-backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-label="Prévia do painel · conta de exemplo"
        aria-modal="true"
        className="modal"
        role="dialog"
      >
        <div className="demo-bar">
          <span className="chip green">somente leitura</span>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>
            Prévia do painel · conta de exemplo
          </span>
          <span style={{ flex: 1 }} />
          <a className="btn accent small" href="/login">
            Entrar para usar <Icon name="arrowRight" size={13} />
          </a>
          <button aria-label="Fechar" className="icon-btn" onClick={onClose} type="button">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ pointerEvents: "none" }}>
          <PanelView panel={EXAMPLE_ACTIVE_PANEL} />
        </div>
      </div>
    </div>
  );
}
