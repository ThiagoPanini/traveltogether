"use client";

import { signIn } from "next-auth/react";
import { type ClipboardEvent, type KeyboardEvent, useRef, useState } from "react";

import { otpDigit, otpFromPaste, otpIsComplete } from "@/lib/identity/otp-code";
import { requestOtp } from "../../lib/api/otp-actions";

type OtpState = "email" | "code" | "submitting" | "error" | "rate-limited";

export function OtpForm() {
  const [state, setState] = useState<OtpState>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function onRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg(null);
    const ok = await requestOtp(email.trim().toLowerCase());
    if (ok) {
      setState("code");
    } else {
      setState("rate-limited");
      setErrorMsg("Muitas tentativas. Aguarde alguns minutos.");
    }
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) return;
    setState("submitting");
    setErrorMsg(null);

    const result = await signIn("otp", {
      email: email.trim().toLowerCase(),
      code: fullCode,
      redirect: false,
      callbackUrl: "/trips",
    });

    if (result?.ok && result.url) {
      window.location.replace(result.url);
    } else {
      setState("code");
      setErrorMsg("Código incorreto ou expirado. Tente novamente.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }

  function onDigitChange(index: number, value: string) {
    const digit = otpDigit(value);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (otpIsComplete(next)) {
      // auto-submit when all 6 digits filled
      const form = inputRefs.current[0]?.closest("form");
      form?.requestSubmit();
    }
  }

  function onDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = otpFromPaste(e.clipboardData.getData("text"));
    if (pasted) {
      e.preventDefault();
      setCode(pasted);
      inputRefs.current[5]?.focus();
    }
  }

  if (state === "email" || state === "rate-limited" || (state === "submitting" && !email)) {
    return (
      <form className="form-grid" onSubmit={onRequestCode}>
        <label className="field">
          <span>Seu e-mail</span>
          <input
            autoComplete="email"
            disabled={state === "submitting"}
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            required
            type="email"
            value={email}
          />
        </label>
        <button
          className="btn accent"
          disabled={state === "submitting"}
          style={{ justifyContent: "center" }}
          type="submit"
        >
          {state === "submitting" ? "Enviando…" : "Receber código"}
        </button>
        {errorMsg && (
          <p className="hint" role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>
            {errorMsg}
          </p>
        )}
      </form>
    );
  }

  return (
    <form className="form-grid" onSubmit={onVerifyCode}>
      <p className="soft" style={{ fontSize: 13, marginBottom: 8 }}>
        Código enviado para <strong>{email}</strong>. Expira em 10 minutos.
      </p>
      <div className="otp-cells">
        {code.map((digit, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: OTP cells are positional by design
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            aria-label={`Dígito ${i + 1} do código`}
            autoComplete="one-time-code"
            className="otp-cell"
            disabled={state === "submitting"}
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
      <button
        className="btn accent"
        disabled={state === "submitting" || !otpIsComplete(code)}
        style={{ justifyContent: "center" }}
        type="submit"
      >
        {state === "submitting" ? "Verificando…" : "Entrar"}
      </button>
      <button
        className="link-btn"
        onClick={() => {
          setState("email");
          setCode(["", "", "", "", "", ""]);
          setErrorMsg(null);
        }}
        style={{ fontSize: 13, marginTop: 4, textAlign: "center" }}
        type="button"
      >
        ← Usar outro e-mail
      </button>
      {errorMsg && (
        <p className="hint" role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>
          {errorMsg}
        </p>
      )}
    </form>
  );
}
