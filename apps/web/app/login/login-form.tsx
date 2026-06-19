"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { isValidEmail, type LoginStep, loginStep } from "@/lib/identity/login-flow";
import { requestOtp } from "../../lib/api/otp-actions";
import { CodeStep } from "./code-step";
import { GoogleMark, Icon } from "./icons";

// Login "Caderno de Bordo" (chassi Espresso, #166): troca de pele, não de
// comportamento — a máquina de passos (choose → email → code) e as actions
// (requestOtp / signIn) seguem intactas. Tipografia sem serifa (títulos em
// Space Grotesk — wordmark traveltogether na entrada (.auth-wordmark), .auth-title
// nos passos seguintes); o dado mono mora nos dígitos do código.
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
    signIn("google", { callbackUrl: "/overview" });
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
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-kicker">
          <span className="compass" aria-hidden="true" />
          <span className="kicker">caderno de bordo</span>
        </div>

        {step === "choose" && (
          <>
            <h1 className="auth-wordmark">
              travel<span className="auth-wordmark-accent">together</span>
            </h1>
            <p className="auth-sub">
              O lugar para organizar sua viagem entre amigos de maneira fácil e rápida
            </p>
            <button
              className="btn ink auth-btn"
              disabled={googleLoading}
              onClick={onGoogle}
              type="button"
            >
              {googleLoading ? (
                "Conectando…"
              ) : (
                <>
                  <GoogleMark /> Continuar com Google
                </>
              )}
            </button>
            <div className="auth-divider">
              <hr />
              <span>ou</span>
              <hr />
            </div>
            <button
              className="btn outline auth-btn"
              disabled={googleLoading}
              onClick={() => setStep((s) => loginStep(s, { type: "chooseEmail" }))}
              type="button"
            >
              <Icon name="mail" size={16} /> Entrar com e-mail
            </button>
            <p className="auth-tagline">Entre para iniciar sua jornada</p>
          </>
        )}

        {step === "email" && (
          <>
            <button
              className="auth-back"
              onClick={() => setStep((s) => loginStep(s, { type: "backToChoose" }))}
              type="button"
            >
              <Icon name="arrowLeft" size={13} /> outras formas de entrar
            </button>
            <h1 className="auth-title sm">Qual seu e-mail?</h1>
            <p className="auth-sub">
              Enviamos um código de 6 dígitos. Sem senha, sem link pra caçar na caixa de entrada.
            </p>
            <form className="auth-form" onSubmit={onSendCode}>
              <label className="auth-field">
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
                className="btn accent auth-btn"
                disabled={!canSend || emailLoading}
                type="submit"
              >
                {emailLoading ? (
                  "Enviando código…"
                ) : (
                  <>
                    Enviar código <Icon name="arrowRight" size={14} />
                  </>
                )}
              </button>
              {emailError && (
                <p className="auth-error" role="alert">
                  <Icon name="alert" size={14} /> {emailError}
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
          <p className="auth-error" role="alert">
            <Icon name="alert" size={14} /> {globalError}
          </p>
        )}
      </div>
    </div>
  );
}
