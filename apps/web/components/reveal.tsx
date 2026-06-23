"use client";

import {
  type CSSProperties,
  createElement,
  type ElementType,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import styles from "./reveal.module.css";

type RevealProps = {
  /** Elemento renderizado (padrão `div`); aceita seções, listas, parágrafos. */
  as?: ElementType;
  /** Atraso da transição em segundos, para escalonar revelações irmãs. */
  delay?: number;
  /** Duração da transição em segundos (padrão 0.7s, definido no módulo). */
  duration?: number;
  /** Deslocamento vertical inicial em px (padrão 22px, definido no módulo). */
  distance?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * Revela o conteúdo quando ele entra na viewport (IntersectionObserver).
 * Degrada com segurança: sem IO ou com reduced-motion, aparece de imediato —
 * o conteúdo nunca fica preso em opacity 0 por falta de JS. Duração/distância/
 * atraso viram custom properties para o módulo aplicar (e o reduced-motion vencer).
 */
export function Reveal({
  as = "div",
  delay,
  duration,
  distance,
  className,
  style,
  children,
}: RevealProps) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!node) return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver !== "function") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  const classes = [styles.reveal, visible ? styles.isVisible : "", className]
    .filter(Boolean)
    .join(" ");

  const vars: Record<`--${string}`, string> = {};
  if (delay) vars["--reveal-delay"] = `${delay}s`;
  if (duration !== undefined) vars["--reveal-dur"] = `${duration}s`;
  if (distance !== undefined) vars["--reveal-dy"] = `${distance}px`;

  return createElement(
    as,
    { ref: setNode, className: classes, style: { ...vars, ...style } },
    children,
  );
}
