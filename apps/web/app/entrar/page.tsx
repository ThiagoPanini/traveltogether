import type { Metadata } from "next";
import { Wordmark } from "@/components/wordmark";
import { isGoogleEnabled } from "@/lib/auth/google";
import styles from "./entrar.module.css";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Entrar · travel·manager",
  description: "Entre com seu código de embarque ou com o Google.",
};

/** Tela de login (ADR-0004): login-card central com o fluxo OTP em duas etapas. */
export default function EntrarPage() {
  return (
    <main className={styles.screen}>
      <Wordmark />
      <section className={styles.card}>
        <h1 className={styles.heading}>Entrar</h1>
        <p className={styles.sub}>Enviamos um código de embarque para o seu e-mail. Sem senha.</p>
        <SignInForm googleEnabled={isGoogleEnabled()} />
      </section>
    </main>
  );
}
