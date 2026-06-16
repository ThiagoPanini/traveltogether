"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Icon } from "@/components/atlas";
import { isValidEmail, type LoginStep, loginStep } from "@/lib/identity/login-flow";
import { requestOtp } from "../../lib/api/otp-actions";
import { CodeStep } from "./code-step";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<LoginStep>("choose");
  const [email, setEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const errorParam = searchParams.get("error");
  const globalError =
    errorParam === "OAuthAccountNotLinked"
      ? "Este e-mail já foi cadastrado por outro método."
      : errorParam
        ? "Não foi possível entrar agora."
        : null;

  const canSend = isValidEmail(email);

  function onGoogle() {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: "/trips" });
  }

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || emailLoading) return;
    setEmailLoading(true);
    setEmailError(null);
    const ok = await requestOtp(email.trim().toLowerCase());
    setEmailLoading(false);
    if (ok) {
      setStep((s) => loginStep(s, { type: "codeSent" }));
    } else {
      setEmailError("Muitas tentativas. Aguarde alguns minutos.");
    }
  }

  return (
    <div style={{ width: "min(440px, 92vw)" }}>
      <div className="card" style={{ padding: "34px 32px" }}>
        <div className="kicker" style={{ marginBottom: 14 }}>
          acesso
        </div>

        {step === "choose" && (
          <>
            <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>
              Entre ou crie sua conta
            </h1>
            <p className="soft" style={{ fontSize: 14.5, marginBottom: 26 }}>
              Qualquer e-mail vale — a conta nasce na hora.{" "}
              <strong style={{ fontWeight: 600 }}>Nunca pedimos senha.</strong>
            </p>
            <button
              className="btn google"
              disabled={googleLoading}
              onClick={onGoogle}
              style={{ height: 46, justifyContent: "center", width: "100%" }}
              type="button"
            >
              {googleLoading ? (
                <>
                  <span className="spinner" /> Conectando…
                </>
              ) : (
                <>
                  <GoogleIcon /> Continuar com Google
                </>
              )}
            </button>
            <div className="divider-or">
              <hr />
              <span>ou</span>
              <hr />
            </div>
            <button
              className="btn ghost"
              disabled={googleLoading}
              onClick={() => setStep((s) => loginStep(s, { type: "chooseEmail" }))}
              style={{ height: 46, justifyContent: "center", width: "100%" }}
              type="button"
            >
              <Icon name="message" size={15} /> Entrar com e-mail
            </button>
          </>
        )}

        {step === "email" && (
          <>
            <button
              className="link-btn"
              onClick={() => setStep((s) => loginStep(s, { type: "backToChoose" }))}
              style={{
                alignItems: "center",
                color: "var(--muted)",
                display: "inline-flex",
                fontSize: 13,
                gap: 5,
                marginBottom: 14,
              }}
              type="button"
            >
              <Icon name="arrowLeft" size={13} /> outras formas de entrar
            </button>
            <h1 className="display" style={{ fontSize: 26, marginBottom: 8 }}>
              Entrar com e-mail
            </h1>
            <p className="soft" style={{ fontSize: 14, marginBottom: 22 }}>
              Enviamos um código de 6 dígitos. Sem senha, sem link pra caçar na caixa de entrada.
            </p>
            <form className="form-grid" onSubmit={onSendCode}>
              <label className="field">
                <span>Seu e-mail</span>
                <input
                  // biome-ignore lint/a11y/noAutofocus: foco direto no único campo do passo
                  autoFocus
                  autoComplete="email"
                  name="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  type="email"
                  value={email}
                />
              </label>
              <button
                className="btn accent"
                disabled={!canSend || emailLoading}
                style={{ height: 46, justifyContent: "center" }}
                type="submit"
              >
                {emailLoading ? (
                  <>
                    <span className="spinner" /> Enviando código…
                  </>
                ) : (
                  <>
                    Enviar código <Icon name="arrowRight" size={14} />
                  </>
                )}
              </button>
              {emailError && (
                <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 4 }}>
                  {emailError}
                </p>
              )}
            </form>
          </>
        )}

        {step === "code" && (
          <CodeStep
            email={email}
            onChangeEmail={() => setStep((s) => loginStep(s, { type: "changeEmail" }))}
          />
        )}

        {globalError && (
          <p className="hint" role="alert" style={{ color: "var(--danger)", marginTop: 16 }}>
            {globalError}
          </p>
        )}
      </div>
      <div style={{ marginTop: 18, textAlign: "center" }}>
        <Link className="link-btn" href="/" style={{ fontSize: 13 }}>
          ← Voltar à página inicial
        </Link>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
