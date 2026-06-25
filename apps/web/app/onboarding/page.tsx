import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Wordmark } from "@/components/wordmark";
import { apiFetch } from "@/lib/bff/server";
import styles from "./onboarding.module.css";
import { OnboardingForm } from "./onboarding-form";
import { SessionBoundary } from "./session-boundary";

export const metadata: Metadata = {
  title: "Quase lá · travel·manager",
  description: "Complete seu perfil para começar a organizar viagens.",
};

type Me = {
  needs_onboarding: boolean;
  profile: { display_name?: string | null } | null;
};

/**
 * Onboarding pós-primeira-autenticação (ADR-0004): captura o Perfil mínimo.
 *
 * Gate em três passos, usando a API como autoridade (não o JWT, que fica obsoleto
 * após onboardar): sem sessão → login; já onboardado → `/app`; do contrário, mostra
 * o formulário. O nome chega pré-preenchido do que o provedor deu (Google) ou de um
 * perfil parcial. Como Google e OTP caem aqui (callback/roteamento), o desvio do já
 * onboardado evita repetir a tela para quem volta.
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session) {
    redirect("/entrar");
  }

  const res = await apiFetch("/auth/me");
  if (!res.ok) {
    redirect("/entrar");
  }
  const me = (await res.json()) as Me;
  if (!me.needs_onboarding) {
    redirect("/app");
  }

  const defaultName = me.profile?.display_name ?? session.user?.name ?? "";

  return (
    <main className={styles.screen}>
      <Wordmark />
      <section className={styles.card}>
        <h1 className={styles.heading}>Quase lá</h1>
        <p className={styles.sub}>Só o essencial para personalizar suas viagens.</p>
        <SessionBoundary session={session}>
          <OnboardingForm defaultName={defaultName} />
        </SessionBoundary>
      </section>
    </main>
  );
}
