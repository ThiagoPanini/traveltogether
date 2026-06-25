import type { Metadata } from "next";
import { auth } from "@/auth";
import { Wordmark } from "@/components/wordmark";
import { apiFetch } from "@/lib/bff/server";
import { logout } from "./actions";
import styles from "./app.module.css";

export const metadata: Metadata = {
  title: "Minhas Viagens · travel·manager",
};

type Me = {
  profile: { display_name?: string | null; origin_city?: string | null } | null;
};

/**
 * Home da área logada (Fase 2, #216): variante "foco central" com empty-state honesto.
 *
 * Nome e cidade de origem vêm de `apiFetch("/auth/me")` no servidor — a sessão JWT
 * não carrega a origem e o usuário OTP não tem nome no token. O botão "Criar primeira
 * viagem" fica desabilitado com "em breve" (criar viagem é Fase 3, ADR-0001).
 * Avatar mostra a inicial do nome. Header sem toggle "Layout".
 */
export default async function AppHome() {
  const session = await auth();

  let displayName = session?.user?.name?.trim() ?? "";
  let originCity = "";

  const res = await apiFetch("/auth/me");
  if (res.ok) {
    const me = (await res.json()) as Me;
    displayName = me.profile?.display_name?.trim() || displayName;
    originCity = me.profile?.origin_city?.trim() || "";
  }

  const nameLabel = displayName || "viajante";
  const initial = nameLabel[0].toUpperCase();

  return (
    <main className={styles.screen}>
      <header className={styles.top}>
        <Wordmark />
        <div className={styles.user}>
          <div className={styles.avatar} aria-hidden="true">
            {initial}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{nameLabel}</span>
            {originCity ? <span className={styles.userCity}>{originCity}</span> : null}
          </div>
          <form action={logout}>
            <button type="submit" className={styles.signout}>
              Sair
            </button>
          </form>
        </div>
      </header>

      <section className={styles.empty}>
        <div className={styles.planeCircle} aria-hidden="true">
          ✈
        </div>
        <h1 className={styles.emptyTitle}>Nenhuma viagem ainda</h1>
        <p className={styles.emptyDesc}>
          Crie a primeira viagem do grupo, tracem as paradas cidade a cidade e comecem a decidir o
          translado — juntos.
        </p>
        <ul className={styles.captions}>
          <li>✦ Cadastrem</li>
          <li>◷ Desenhem as paradas</li>
          <li>✈ Pesquisem o translado</li>
        </ul>
        <div className={styles.ctaWrap}>
          <button type="button" className={styles.cta} disabled>
            Criar primeira viagem
          </button>
          <span className={styles.soon}>em breve</span>
        </div>
      </section>
    </main>
  );
}
