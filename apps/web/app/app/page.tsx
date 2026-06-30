import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/bff/server";
import styles from "./app.module.css";
import { type PendingInvitation, PendingInvitations } from "./pending-invitations";

export const metadata: Metadata = {
  title: "Painel de bordo · travel·manager",
};

type Me = {
  profile: {
    display_name?: string | null;
    origin_city?: string | null;
    country?: string | null;
  } | null;
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

export default async function AppHome() {
  const session = await auth();

  let displayName = session?.user?.name?.trim() ?? "";
  let originCity = "";
  let originCountry = "";

  const me = await fetchJson<Me | null>("/auth/me", null);
  if (me) {
    displayName = me.profile?.display_name?.trim() || displayName;
    originCity = me.profile?.origin_city?.trim() || "";
    originCountry = me.profile?.country?.trim() || "";
  }

  const trips = await fetchJson<TripSummary[]>("/trips", []);
  const invitations = await fetchJson<PendingInvitation[]>("/invitations", []);

  const nameLabel = displayName || "viajante";
  const firstName = nameLabel.split(/\s+/)[0];
  const initial = nameLabel[0]?.toUpperCase() || "V";
  const organizerCount = trips.filter((trip) => trip.my_role === "organizer").length;
  const primaryRole = organizerCount > 0 ? "Organiza" : "Membro";
  const originLabel = originCity || "Origem";
  const originMeta = [originCity, originCountry].filter(Boolean).join(" · ") || "Origem a definir";

  return (
    <main className={styles.content}>
      <div className={styles.mobileProfile}>
        <div>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <div>
            <strong>{nameLabel}</strong>
            <small>{originMeta}</small>
          </div>
        </div>
        <span>
          <span aria-hidden="true" /> Base ativa
        </span>
      </div>

      <section className={styles.hero} aria-labelledby="dashboard-title">
        <div>
          <p className={styles.eyebrow}>Olá, {firstName} · tudo a bordo</p>
          <h1 id="dashboard-title">
            Seu mapa está
            <br />
            em movimento.
          </h1>
          <p>
            Abra uma viagem para rever paradas, translados propostos e quem já está na tripulação.
          </p>
        </div>

        <dl className={styles.metrics} aria-label="Resumo do painel">
          <div>
            <dt>Viagens ativas</dt>
            <dd>{String(trips.length).padStart(2, "0")}</dd>
          </div>
          <div>
            <dt>Origem-base</dt>
            <dd>{originLabel}</dd>
          </div>
          <div>
            <dt>Papel</dt>
            <dd>{primaryRole}</dd>
          </div>
        </dl>
      </section>

      <div className={styles.dashboardGrid}>
        <section id="viagens" className={styles.tripsSection} aria-labelledby="trips-title">
          <div className={styles.sectionHeading}>
            <div>
              <p>Caderno de bordo · participações</p>
              <h2 id="trips-title">Minhas viagens</h2>
            </div>
            <span className={styles.sectionCount}>
              {trips.length} {trips.length === 1 ? "viagem" : "viagens"}
            </span>
          </div>

          {trips.length > 0 ? (
            <ul className={styles.trips}>
              {trips.map((trip, index) => (
                <li key={trip.id}>
                  <Link href={`/app/viagens/${trip.id}`} className={styles.tripCard}>
                    <span className={styles.tripTopline}>
                      <span className={styles.tripIndex}>
                        Viagem {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`${styles.tripRole} ${
                          trip.my_role === "organizer" ? styles.tripRoleOrganizer : ""
                        }`}
                      >
                        {ROLE_LABEL[trip.my_role]}
                      </span>
                    </span>
                    <h3>
                      <span>{trip.name}</span>
                      <small>{trip.destination_city}</small>
                    </h3>
                    <span className={styles.tripRoute}>
                      <span>{originLabel}</span>
                      <span aria-hidden="true">→</span>
                      <span>{trip.destination_city}</span>
                    </span>
                    <span className={styles.tripProgress}>
                      <span aria-hidden="true" />
                      {trip.stop_count} {trip.stop_count === 1 ? "parada" : "paradas"} na rota
                    </span>
                    <span className={styles.openTrip}>Abrir painel</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyBoard}>
              <span>00</span>
              <h3>Nenhuma viagem no radar — ainda.</h3>
              <p>Crie o primeiro esqueleto da jornada, convide o grupo e tracem as Paradas.</p>
              <Link href="/app/viagens/nova" className={styles.primaryAction}>
                Criar primeira viagem →
              </Link>
            </div>
          )}
        </section>

        <aside className={styles.rail}>
          <section id="convites" className={styles.railCard}>
            <div className={styles.railTitle}>
              <h2>Convites</h2>
              <span>{invitations.length}</span>
            </div>
            <PendingInvitations invitations={invitations} />
          </section>

          <section className={styles.noteCard}>
            <span>Nota de bordo</span>
            <p>
              A viagem é do grupo. A escolha é de cada pessoa — sem votação que decida por alguém.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
