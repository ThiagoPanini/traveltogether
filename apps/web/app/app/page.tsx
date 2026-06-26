import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { Wordmark } from "@/components/wordmark";
import { apiFetch } from "@/lib/bff/server";
import { logout } from "./actions";
import styles from "./app.module.css";
import { type PendingInvitation, PendingInvitations } from "./pending-invitations";

export const metadata: Metadata = {
  title: "Minhas Viagens · travel·manager",
};

type Me = {
  profile: { display_name?: string | null; origin_city?: string | null } | null;
};

type TripSummary = {
  id: string;
  name: string;
  destination_city: string;
  stop_count: number;
  my_role: "organizer" | "member";
};

const ROLE_LABEL = { member: "Membro", organizer: "Organizador" } as const;

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await apiFetch(path);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/**
 * Home da área logada (Fase 3): lista as viagens que participo (`GET /trips` — via
 * Participação, inv. 9), os convites pendentes (`GET /invitations`) com aceitar, e o
 * CTA "Criar viagem". Empty-state honesto quando ainda não há viagens. Nome e cidade
 * vêm de `/auth/me` (a sessão JWT não carrega a origem).
 */
export default async function AppHome() {
  const session = await auth();

  let displayName = session?.user?.name?.trim() ?? "";
  let originCity = "";

  const me = await fetchJson<Me | null>("/auth/me", null);
  if (me) {
    displayName = me.profile?.display_name?.trim() || displayName;
    originCity = me.profile?.origin_city?.trim() || "";
  }

  const trips = await fetchJson<TripSummary[]>("/trips", []);
  const invitations = await fetchJson<PendingInvitation[]>("/invitations", []);

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

      {invitations.length > 0 ? <PendingInvitations invitations={invitations} /> : null}

      {trips.length === 0 ? (
        <section className={styles.empty}>
          <div className={styles.planeCircle} aria-hidden="true">
            ✈
          </div>
          <h1 className={styles.emptyTitle}>Nenhuma viagem ainda</h1>
          <p className={styles.emptyDesc}>
            Crie a primeira viagem do grupo, tracem as paradas cidade a cidade e comecem a decidir o
            translado — juntos.
          </p>
          <Link href="/app/viagens/nova" className={styles.cta}>
            Criar viagem
          </Link>
        </section>
      ) : (
        <section className={styles.list}>
          <div className={styles.listHead}>
            <h1 className={styles.listTitle}>Minhas viagens</h1>
            <Link href="/app/viagens/nova" className={styles.ctaInline}>
              + Criar viagem
            </Link>
          </div>
          <ul className={styles.trips}>
            {trips.map((trip) => (
              <li key={trip.id}>
                <Link href={`/app/viagens/${trip.id}`} className={styles.tripCard}>
                  <span className={styles.tripKicker}>Destino</span>
                  <span className={styles.tripName}>{trip.name}</span>
                  <span className={styles.tripDest}>{trip.destination_city}</span>
                  <span className={styles.tripMeta}>
                    {trip.stop_count} {trip.stop_count === 1 ? "parada" : "paradas"} ·{" "}
                    {ROLE_LABEL[trip.my_role]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
