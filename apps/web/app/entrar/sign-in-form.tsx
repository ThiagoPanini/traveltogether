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
 *
 * Visual fiel ao protótipo Noturno (tela `login`): card com eyebrow "controle de
 * embarque", título e subtítulo centrados, células do código, linha de expiração com
 * ponto + reenvio, "Embarcar", divisor "ou" e Google.
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

  const progress = (
    <div className={styles.progress}>
      <div>
        <span className={step === "code" ? styles.progressDone : styles.progressActive} />
        <strong>01 · E-mail</strong>
      </div>
      <div>
        <span className={step === "code" ? styles.progressActive : ""} />
        <strong className={step === "code" ? undefined : styles.progressMuted}>02 · Código</strong>
      </div>
    </div>
  );

  const divisor = (
    <div className={styles.divisor}>
      <span className={styles.divisorLabel}>ou</span>
    </div>
  );

  const googleButton = googleEnabled ? (
    <button
      type="button"
      className={styles.google}
      onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
    >
      <span aria-hidden="true" className={styles.googleMark}>
        G
      </span>
      Continuar com Google
    </button>
  ) : null;

  if (step === "email") {
    return (
      <section className={styles.card}>
        {progress}
        <h1 className={styles.heading}>Apresente seu e-mail</h1>
        <p className={styles.sub}>
          Enviaremos um código de embarque de 6 dígitos. Sem senha para lembrar.
        </p>
        <form className={styles.form} onSubmit={handleRequest}>
          <label className={styles.field}>
            <span className={styles.label}>E-mail</span>
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
            Continuar →
          </button>
          {googleButton ? (
            <>
              {divisor}
              {googleButton}
              <p className={styles.googleNote}>
                Google aparece só quando disponível neste ambiente
              </p>
            </>
          ) : null}
        </form>
      </section>
    );
  }

  const alerta = remaining < 60;
  const ttlPercent = Math.max(0, Math.round((remaining / OTP_TTL_SECONDS) * 100));
  return (
    <section className={styles.card}>
      {progress}
      <div className={styles.codeHeading}>
        <h1 className={styles.heading}>Apresente seu código</h1>
        <button type="button" className={styles.swapEmail} onClick={trocarEmail}>
          ← trocar e-mail
        </button>
      </div>
      <p className={styles.sub}>
        Enviamos 6 dígitos para <span className={styles.subEmail}>{email}</span>
      </p>
      <form className={styles.form} onSubmit={handleVerify}>
        <OtpInput value={code} onChange={setCode} disabled={pending} />
        <div className={`${styles.ttlRow} ${alerta ? styles.alerta : ""}`}>
          <span className={styles.ttl} aria-live="polite">
            <span className={styles.ttlDot} aria-hidden="true" />
            Expira em <span className={styles.ttlTime}>{formatRemaining(remaining)}</span>
          </span>
          <button
            type="button"
            className={styles.resend}
            onClick={handleResend}
            disabled={pending || resendIn > 0}
          >
            {resendIn > 0 ? `Reenviar em ${resendIn}` : "Reenviar código"}
          </button>
        </div>
        <div className={styles.ttlTrack} aria-hidden="true">
          <span style={{ width: `${ttlPercent}%` }} />
        </div>
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
      </form>
      <p className={styles.prototypeHint}>Dica do protótipo · qualquer 6 dígitos embarcam</p>
    </section>
  );
}
