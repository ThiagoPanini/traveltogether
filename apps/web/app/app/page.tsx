import type { Metadata } from "next";
import { auth } from "@/auth";
import { Wordmark } from "@/components/wordmark";
import { logout } from "./actions";
import styles from "./app.module.css";

export const metadata: Metadata = {
  title: "Minhas Viagens · travel·manager",
};

/**
 * Home da área logada (#193): empty-state honesto. Saúda pelo nome e anuncia, em **uma
 * linha**, que criar viagem está chegando — sem grade global de "em breve" (a nota do
 * ADR-0001 reserva o `em-breve-card` para dentro de uma Viagem; a shell rica "Minhas
 * Viagens" é Fase 3). A proteção de quem chega aqui é o `middleware`; o destino do
 * onboarding é a página `/onboarding`. O botão "Sair" dispara a Server Action de
 * logout (revoga na API + limpa o cookie).
 */
export default async function AppHome() {
  const session = await auth();
  const name = session?.user?.name?.trim() || "viajante";

  return (
    <main className={styles.screen}>
      <header className={styles.top}>
        <Wordmark />
        <form action={logout}>
          <button type="submit" className={styles.signout}>
            Sair
          </button>
        </form>
      </header>
      <section className={styles.empty}>
        <h1 className={styles.greeting}>Olá, {name}</h1>
        <p className={styles.coming}>Criar viagem está chegando.</p>
      </section>
    </main>
  );
}
