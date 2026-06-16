"use client";

import { signIn } from "next-auth/react";
import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/atlas";
import { CODE_TTL_SECONDS, canResend, formatTtl } from "@/lib/identity/login-flow";
import { OTP_LENGTH, otpDigit, otpFromPaste, otpIsComplete } from "@/lib/identity/otp-code";
import { requestOtp } from "../../lib/api/otp-actions";

const EMPTY_CODE = Array.from({ length: OTP_LENGTH }, () => "");

/**
 * Passo `code` do Login: células OTP + cronômetro regressivo (TTL), reenvio e
 * estado "expirado". A verdade da verificação é o backend via `signIn("otp")`;
 * aqui só dirigimos o fluxo e o feedback visual.
 */
export function CodeStep({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [expired, setExpired] = useState(false);
  const [seconds, setSeconds] = useState(CODE_TTL_SECONDS);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cronômetro regressivo do TTL: ao chegar a zero, marca o código como expirado.
  useEffect(() => {
    if (expired) return;
    if (seconds <= 0) {
      setExpired(true);
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, expired]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!otpIsComplete(code) || expired || verifying) return;
    setVerifying(true);
    setError(null);

    const result = await signIn("otp", {
      email: email.trim().toLowerCase(),
      code: code.join(""),
      redirect: false,
      callbackUrl: "/trips",
    });

    if (result?.ok && result.url) {
      window.location.replace(result.url);
      return;
    }
    setVerifying(false);
    setError("Código incorreto. Confira os 6 dígitos e tente de novo.");
    setCode(EMPTY_CODE);
    inputRefs.current[0]?.focus();
  }

  function onDigitChange(index: number, value: string) {
    const digit = otpDigit(value);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError(null);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (otpIsComplete(next) && !expired) {
      inputRefs.current[0]?.closest("form")?.requestSubmit();
    }
  }

  function onDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = otpFromPaste(e.clipboardData.getData("text"));
    if (!pasted) return;
    e.preventDefault();
    setCode(pasted);
    setError(null);
    inputRefs.current[OTP_LENGTH - 1]?.focus();
  }

  async function onResend() {
    if (!canResend(seconds, expired)) return;
    setCode(EMPTY_CODE);
    setError(null);
    setExpired(false);
    setSeconds(CODE_TTL_SECONDS);
    inputRefs.current[0]?.focus();
    await requestOtp(email.trim().toLowerCase());
    setResent(true);
    setTimeout(() => setResent(false), 2600);
  }

  return (
    <form className="form-grid" onSubmit={onVerify}>
      <button
        className="link-btn"
        onClick={onChangeEmail}
        style={{
          alignItems: "center",
          color: "var(--muted)",
          display: "inline-flex",
          fontSize: 13,
          gap: 5,
          textAlign: "left",
        }}
        type="button"
      >
        <Icon name="arrowLeft" size={13} /> trocar e-mail
      </button>
      <div>
        <h1 className="display" style={{ fontSize: 26, marginBottom: 8 }}>
          Digite o código
        </h1>
        <p className="soft" style={{ fontSize: 14 }}>
          Enviamos um código de 6 dígitos para <strong>{email}</strong>.
        </p>
      </div>

      <div className={`otp-cells ${error ? "shake" : ""}`}>
        {code.map((digit, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: OTP cells are positional by design
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            aria-label={`Dígito ${i + 1} do código`}
            autoComplete="one-time-code"
            className={`otp-cell ${error ? "err" : ""}`}
            disabled={expired || verifying}
            inputMode="numeric"
            maxLength={1}
            onChange={(e) => onDigitChange(i, e.target.value)}
            onKeyDown={(e) => onDigitKeyDown(i, e)}
            onPaste={i === 0 ? onPaste : undefined}
            pattern="[0-9]"
            type="text"
            value={digit}
          />
        ))}
      </div>

      {error && (
        <p
          role="alert"
          style={{
            alignItems: "center",
            color: "var(--danger)",
            display: "flex",
            fontSize: 13,
            gap: 6,
          }}
        >
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
      {resent && (
        <p
          role="status"
          style={{
            alignItems: "center",
            color: "var(--ok)",
            display: "flex",
            fontSize: 13,
            gap: 6,
          }}
        >
          <Icon name="check" size={14} /> Novo código enviado.
        </p>
      )}

      {expired ? (
        <div className="empty" style={{ padding: "20px 18px" }}>
          <Icon name="clock" size={20} />
          <div style={{ color: "var(--ink-soft)", fontWeight: 600 }}>Esse código expirou</div>
          <div style={{ fontSize: 13 }}>
            Códigos valem por 5 minutos. Peça um novo para continuar.
          </div>
        </div>
      ) : (
        <button
          className="btn accent"
          disabled={!otpIsComplete(code) || verifying}
          style={{ height: 46, justifyContent: "center" }}
          type="submit"
        >
          {verifying ? (
            <>
              <span className="spinner" /> Verificando…
            </>
          ) : (
            <>
              Entrar <Icon name="arrowRight" size={14} />
            </>
          )}
        </button>
      )}

      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>
          {expired ? "código expirado" : `expira em ${formatTtl(seconds)}`}
        </span>
        <button
          className="link-btn"
          disabled={!canResend(seconds, expired)}
          onClick={onResend}
          style={{ alignItems: "center", display: "inline-flex", fontSize: 13, gap: 5 }}
          type="button"
        >
          <Icon name="refresh" size={12} /> Reenviar código
        </button>
      </div>
    </form>
  );
}
