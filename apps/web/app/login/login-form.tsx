"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { type FormEvent, useMemo, useState } from "react";

type LoginState = "idle" | "submitting" | "closed-beta" | "error";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<LoginState>("idle");

  const message = useMemo(() => {
    if (state === "closed-beta" || searchParams.get("error")) {
      return "Beta fechado para este e-mail.";
    }
    if (state === "error") return "Não foi possível entrar agora.";
    return null;
  }, [searchParams, state]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");

    const result = await signIn("credentials", {
      email,
      redirect: false,
      callbackUrl: "/",
    });

    if (result?.ok) {
      router.replace(result.url ?? "/");
      router.refresh();
      return;
    }

    setState(result?.error === "CredentialsSignin" ? "closed-beta" : "error");
  }

  return (
    <form className="login-panel" onSubmit={onSubmit}>
      <div className="login-heading">
        <p>traveltogether</p>
        <h1>Acesso privado</h1>
      </div>
      <label className="login-field">
        <span>E-mail</span>
        <input
          autoComplete="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@example.com"
          required
          type="email"
          value={email}
        />
      </label>
      <button className="primary-button" disabled={state === "submitting"} type="submit">
        {state === "submitting" ? "Entrando..." : "Entrar"}
      </button>
      <p className="login-message" role="status">
        {message}
      </p>
    </form>
  );
}
