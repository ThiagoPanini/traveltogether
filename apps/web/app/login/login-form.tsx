"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

type LoginState = "idle" | "submitting" | "error";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoginState>("idle");

  const errorParam = searchParams.get("error");
  const message =
    errorParam === "OAuthAccountNotLinked"
      ? "Este e-mail já foi cadastrado por outro método."
      : errorParam
        ? "Não foi possível entrar agora."
        : state === "error"
          ? "Não foi possível entrar agora."
          : null;

  async function onGoogleSignIn() {
    setState("submitting");
    await signIn("google", { callbackUrl: "/trips" });
  }

  return (
    <div style={{ width: "min(420px, 92vw)" }}>
      <div className="card" style={{ padding: "36px 34px" }}>
        <div className="kicker" style={{ marginBottom: 14 }}>
          embarque
        </div>
        <h1 className="display" style={{ fontSize: 30, marginBottom: 8 }}>
          Identifique-se
        </h1>
        <p className="soft" style={{ fontSize: 14.5, marginBottom: 26 }}>
          Entre com sua conta Google para acessar o traveltogether.
        </p>
        <div className="form-grid">
          <button
            className="btn accent"
            disabled={state === "submitting"}
            onClick={onGoogleSignIn}
            style={{ justifyContent: "center", gap: 8 }}
            type="button"
          >
            <GoogleIcon />
            {state === "submitting" ? "Entrando…" : "Continuar com Google"}
          </button>
        </div>
        {message && (
          <p className="hint" role="status" style={{ marginTop: 16, color: "var(--danger)" }}>
            {message}
          </p>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <Link className="link-btn" href="/" style={{ fontSize: 13 }}>
          ← Voltar à página inicial
        </Link>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
