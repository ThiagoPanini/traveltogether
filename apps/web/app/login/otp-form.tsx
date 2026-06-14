"use client";

import { signIn } from "next-auth/react";
import { type ClipboardEvent, type KeyboardEvent, useRef, useState } from "react";

import { requestOtp } from "../../lib/api/otp";

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
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
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
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setCode(pasted.split(""));
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
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          margin: "8px 0 16px",
        }}
      >
        {code.map((digit, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: OTP cells are positional by design
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            aria-label={`Dígito ${i + 1} do código`}
            autoComplete="one-time-code"
            disabled={state === "submitting"}
            inputMode="numeric"
            maxLength={1}
            onChange={(e) => onDigitChange(i, e.target.value)}
            onKeyDown={(e) => onDigitKeyDown(i, e)}
            onPaste={i === 0 ? onPaste : undefined}
            pattern="[0-9]"
            style={{
              width: 44,
              height: 56,
              textAlign: "center",
              fontSize: 24,
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: 0,
              background: "var(--surface-2, #1a2820)",
              border: "1px solid var(--border, #2d4a38)",
              borderRadius: 6,
              color: "var(--accent, #e08040)",
              caretColor: "var(--accent, #e08040)",
            }}
            type="text"
            value={digit}
          />
        ))}
      </div>
      <button
        className="btn accent"
        disabled={state === "submitting" || code.some((d) => !d)}
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
