import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { isGoogleEnabled } from "@/lib/auth/google";
import styles from "./entrar.module.css";
import { SignInForm } from "./sign-in-form";

// Os env do Google são runtime-only (não buildtime). Sem force-dynamic a página
// seria pré-renderizada estática e assaria googleEnabled=false para sempre — o
// botão jamais habilitaria mesmo com os env presentes em produção.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar · travel·manager",
  description: "Entre com seu código de embarque ou com o Google.",
};

/**
 * Tela de login (ADR-0004): cabeçalho de "controle de embarque" + login-card central
 * com o fluxo OTP em duas etapas, fiel ao protótipo do sistema visual Noturno.
 */
export default function EntrarPage() {
  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Voltar à página inicial">
          <Wordmark size={19} />
        </Link>
        <span className={styles.tagline}>controle de embarque</span>
      </header>
      <div className={styles.main}>
        <div className={styles.cardWrap}>
          <SignInForm googleEnabled={isGoogleEnabled()} />
        </div>
      </div>
    </main>
  );
}
