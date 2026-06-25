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

  const divisor = (
    <div className={styles.divisor}>
      <span className={styles.divisorLabel}>ou</span>
    </div>
  );

  const googleButton = (
    <button
      type="button"
      className={styles.google}
      disabled={!googleEnabled}
      title={googleEnabled ? undefined : "Indisponível neste ambiente"}
      onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
    >
      {googleEnabled ? (
        <>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6150z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2582c-.8055.54-1.8354.859-3.0477.859-2.344 0-4.3282-1.5836-5.036-3.7104H.957v2.3318C2.4382 15.9832 5.4818 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71C3.7845 10.17 3.6818 9.5932 3.6818 9s.1027-1.17.2822-1.71V4.9582H.957A8.9965 8.9965 0 0 0 0 9c0 1.4514.3477 2.8264.957 4.0418L3.964 10.71z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.957 4.9582L3.964 7.29C4.6718 5.1632 6.656 3.5795 9 3.5795z"
              fill="#EA4335"
            />
          </svg>
          Continuar com Google
        </>
      ) : (
        "Google indisponível"
      )}
    </button>
  );

  if (step === "email") {
    return (
      <section className={styles.card}>
        <p className={styles.eyebrow}>Controle de embarque</p>
        <h1 className={styles.heading}>Apresente seu e-mail</h1>
        <p className={styles.sub}>Enviaremos um código para sua entrada</p>
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
            Continuar
          </button>
          {divisor}
          {googleButton}
        </form>
      </section>
    );
  }

  const alerta = remaining < 60;
  return (
    <>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Controle de embarque</p>
        <h1 className={styles.heading}>Apresente seu código</h1>
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
          {divisor}
          {googleButton}
        </form>
      </section>
      <div className={styles.footer}>
        <button type="button" className={styles.footerLink} onClick={trocarEmail}>
          trocar e-mail
        </button>
      </div>
    </>
  );
}
