"use client";

import { signIn } from "next-auth/react";
import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { CODE_TTL_SECONDS, canResend, formatTtl } from "@/lib/identity/login-flow";
import { OTP_LENGTH, otpDigit, otpFromPaste, otpIsComplete } from "@/lib/identity/otp-code";
import { requestOtp } from "../../lib/api/otp-actions";
import { Icon } from "./icons";

const EMPTY_CODE = Array.from({ length: OTP_LENGTH }, () => "");

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Passo `code` do Login ("Carimbe a entrada", #166): células DM Mono que
 * assentam por dígito + carimbo "A bordo ✓" antes de navegar. A verdade da
 * verificação é o backend via `signIn("otp")`; aqui só dirigimos o fluxo e o
 * feedback visual. Pele Espresso — comportamento intacto.
 */
export function CodeStep({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [expired, setExpired] = useState(false);
  const [seconds, setSeconds] = useState(CODE_TTL_SECONDS);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cronômetro regressivo do TTL: ao chegar a zero, marca o código como expirado.
  useEffect(() => {
    if (expired || verified) return;
    if (seconds <= 0) {
      setExpired(true);
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, expired, verified]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!otpIsComplete(code) || expired || verifying || verified) return;
    setVerifying(true);
    setError(null);

    const result = await signIn("otp", {
      email: email.trim().toLowerCase(),
      code: code.join(""),
      redirect: false,
      callbackUrl: "/overview",
    });

    if (result?.ok && result.url) {
      // Carimba "A bordo ✓" e só então navega — o beat assinatura do login.
      const url = result.url;
      setVerified(true);
      setTimeout(() => window.location.replace(url), prefersReducedMotion() ? 150 : 850);
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
    <form className="auth-form" onSubmit={onVerify}>
      <button className="auth-back" onClick={onChangeEmail} type="button">
        <Icon name="arrowLeft" size={13} /> trocar e-mail
      </button>
      <div>
        <h1 className="auth-title sm">Carimbe a entrada</h1>
        <p className="auth-sub">
          Os 6 dígitos que enviamos para <strong>{email}</strong>.
        </p>
      </div>

      <div className={`auth-otp ${error ? "shake" : ""}`}>
        {code.map((digit, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: células OTP são posicionais por desenho
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            aria-label={`Dígito ${i + 1} do código`}
            autoComplete="one-time-code"
            className={`auth-otp-cell ${digit ? "filled" : ""} ${error ? "err" : ""}`}
            disabled={expired || verifying || verified}
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

      {verified && (
        <div className="auth-stamp-wrap">
          <span className="auth-stamp">A bordo ✓</span>
        </div>
      )}

      {error && (
        <p className="auth-error" role="alert">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
      {resent && (
        <p className="auth-ok" role="status">
          <Icon name="check" size={14} /> Novo código enviado.
        </p>
      )}

      {!verified &&
        (expired ? (
          <div className="auth-expired">
            <Icon name="clock" size={20} />
            <div className="auth-expired-title">Esse código expirou</div>
            <div>Códigos valem por 5 minutos. Peça um novo para continuar.</div>
          </div>
        ) : (
          <button
            className="btn accent auth-btn"
            disabled={!otpIsComplete(code) || verifying}
            type="submit"
          >
            {verifying ? (
              "Verificando…"
            ) : (
              <>
                Entrar <Icon name="arrowRight" size={14} />
              </>
            )}
          </button>
        ))}

      {!verified && (
        <div className="auth-foot">
          <span className="auth-ttl">
            {expired ? "código expirado" : `expira em ${formatTtl(seconds)}`}
          </span>
          <button
            className="auth-back"
            disabled={!canResend(seconds, expired)}
            onClick={onResend}
            type="button"
          >
            <Icon name="refresh" size={12} /> Reenviar código
          </button>
        </div>
      )}
    </form>
  );
}
