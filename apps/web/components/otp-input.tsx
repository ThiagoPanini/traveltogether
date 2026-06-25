"use client";

import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";
import styles from "./otp-input.module.css";

const LENGTH = 6;

type OtpInputProps = {
  /** Código corrente (string de até 6 dígitos). */
  value: string;
  /** Recebe o código remontado a cada edição (só dígitos). */
  onChange: (value: string) => void;
  /** Rótulo acessível do grupo. */
  label?: string;
  /** Desabilita a edição (durante o envio). */
  disabled?: boolean;
};

/**
 * Coleta o código de embarque de 6 dígitos no login (Fase 2; design `otp-input`).
 *
 * Seis células com `inputmode="numeric"` + `autocomplete="one-time-code"` para casar
 * com o autofill de OTP do sistema. Suporta colagem e autofill multi-dígito: ao
 * receber vários dígitos, distribui pelas células e leva o foco à última preenchida.
 * Controlado: o pai detém o `value` e recebe a string remontada.
 */
export function OtpInput({
  value,
  onChange,
  label = "Código de embarque",
  disabled = false,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = value.split("");

  function replaceAt(index: number, digit: string): string {
    return (value.slice(0, index) + digit + value.slice(index + 1)).slice(0, LENGTH);
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      return;
    }
    if (digits.length > 1) {
      // Autofill do SO despeja múltiplos dígitos na célula — distribui a partir de index.
      const newCode = (value.slice(0, index) + digits).slice(0, LENGTH);
      onChange(newCode);
      refs.current[Math.min(index + digits.length - 1, LENGTH - 1)]?.focus();
      return;
    }
    onChange(replaceAt(index, digits));
    refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace") {
      return;
    }
    event.preventDefault();
    if (chars[index]) {
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    const prev = index - 1;
    if (prev >= 0) {
      onChange(value.slice(0, prev) + value.slice(prev + 1));
      refs.current[prev]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!digits) {
      return;
    }
    const newCode = (value.slice(0, index) + digits).slice(0, LENGTH);
    onChange(newCode);
    refs.current[Math.min(index + digits.length - 1, LENGTH - 1)]?.focus();
  }

  return (
    <fieldset className={styles.group} aria-label={label} disabled={disabled}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.cells}>
        {Array.from({ length: LENGTH }, (_, index) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: posição fixa de célula
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            className={styles.cell}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={LENGTH}
            value={chars[index] ?? ""}
            aria-label={`dígito ${index + 1}`}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(event, index)}
          />
        ))}
      </div>
    </fieldset>
  );
}
