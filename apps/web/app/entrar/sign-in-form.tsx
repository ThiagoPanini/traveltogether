"use client";

import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { OtpInput } from "@/components/otp-input";
import styles from "./entrar.module.css";

const OTP_TTL_SECONDS = 600;
const CODE_LENGTH = 6;
// Cooldown de reenvio no cliente (#194): espelha o teto do servidor e evita o
// disparo repetido que voltaria como 429.
const RESEND_COOLDOWN_SECONDS = 30;

type Step = "email" | "code";

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Login em duas etapas: e-mail → código → onboarding ou `/app`, com Google como
 * alternativa.
 *
 * Passo 1 pede o código ao proxy do BFF (`/api/otp/request`, anti-enumeração na
 * API). Passo 2 entrega e-mail+código ao provedor `otp` do Auth.js, que verifica na
 * API interna e cunha a sessão (ADR-0004); usuário novo (sem perfil) vai ao
 * `/onboarding` antes da área logada (#192). "Continuar com Google" dispara o
 * provedor `google` do Auth.js (#191), que troca o `id_token` por uma sessão na API e
 * cai no `/onboarding` (que desvia quem já onboardou); sem credencial Google
 * (`googleEnabled` falso), o botão fica "indisponível". O reenvio do código tem
 * cooldown de 30s (#194), espelhando o teto do servidor.
 */
export function SignInForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [remaining, setRemaining] = useState(OTP_TTL_SECONDS);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (step !== "code") {
      return;
    }
    const id = setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
      setResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  async function pedirCodigo(): Promise<boolean> {
    const res = await fetch("/api/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  }

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (!(await pedirCodigo())) {
        throw new Error("request failed");
      }
      setCode("");
      setRemaining(OTP_TTL_SECONDS);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setStep("code");
    } catch {
      setError("Não consegui enviar o código agora. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0 || pending) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      if (!(await pedirCodigo())) {
        throw new Error("resend failed");
      }
      setCode("");
      setRemaining(OTP_TTL_SECONDS);
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Não consegui reenviar o código agora. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await signIn("otp", { email, code, redirect: false });
    if (!result?.ok || result.error) {
      setPending(false);
      setError("Código inválido ou expirado. Confira e tente de novo.");
      setCode("");
      return;
    }
    // Usuário novo (sem perfil) passa pelo onboarding antes da área logada (#192).
    const session = await getSession();
    router.push(session?.needsOnboarding ? "/onboarding" : "/app");
  }

  function trocarEmail() {
    setStep("email");
    setCode("");
    setError(null);
  }

  if (step === "email") {
    return (
      <form className={styles.form} onSubmit={handleRequest}>
        <label className={styles.field}>
          <span className={`mono ${styles.label}`}>E-mail</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@email.com"
          />
        </label>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={styles.primary} disabled={pending || !email}>
          Continuar
        </button>
        <div className={styles.divisor}>
          <span className={`mono ${styles.divisorLabel}`}>ou</span>
        </div>
        <button
          type="button"
          className={styles.google}
          disabled={!googleEnabled}
          title={googleEnabled ? undefined : "Indisponível neste ambiente"}
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
        >
          {googleEnabled ? "Continuar com Google" : "Google indisponível"}
        </button>
      </form>
    );
  }

  const alerta = remaining < 60;
  return (
    <form className={styles.form} onSubmit={handleVerify}>
      <OtpInput value={code} onChange={setCode} disabled={pending} />
      <p
        className={`mono ${styles.contador} ${alerta ? styles.contadorAlerta : ""}`}
        aria-live="polite"
      >
        Expira em {formatRemaining(remaining)}
      </p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className={styles.primary}
        disabled={pending || code.length < CODE_LENGTH}
      >
        Embarcar →
      </button>
      <button
        type="button"
        className={styles.ghost}
        onClick={handleResend}
        disabled={pending || resendIn > 0}
      >
        {resendIn > 0 ? `Reenviar em ${formatRemaining(resendIn)}` : "Reenviar código"}
      </button>
      <button type="button" className={styles.ghost} onClick={trocarEmail}>
        Trocar e-mail
      </button>
    </form>
  );
}
