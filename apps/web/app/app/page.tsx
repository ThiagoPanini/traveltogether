import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/bff/server";
import { logout } from "./actions";
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
  const featuredTrip = trips[0] ?? null;

  return (
    <main className={styles.screen}>
      <aside className={styles.sidebar} aria-label="Menu principal">
        <Link href="/app" className={styles.brand} aria-label="travelmanager — painel">
          <span aria-hidden="true">✦</span>
          travel·manager
        </Link>

        <nav className={styles.primaryNav} aria-label="Navegação do painel">
          <span className={`${styles.navItem} ${styles.navItemActive}`} aria-current="page">
            <span aria-hidden="true">◈</span>
            <span>Painel</span>
          </span>
          <a href="#viagens" className={styles.navItem}>
            <span aria-hidden="true">⊞</span>
            <span>Minhas viagens</span>
            <strong>{trips.length}</strong>
          </a>
          <a href="#convites" className={styles.navItem}>
            <span aria-hidden="true">✉</span>
            <span>Convites</span>
            <strong className={styles.inviteBadge}>{invitations.length}</strong>
          </a>
        </nav>

        <Link href="/app/viagens/nova" className={styles.sidebarCta}>
          <span aria-hidden="true">+</span> Nova viagem
        </Link>

        <div className={styles.profileCard}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <div>
            <strong>{nameLabel}</strong>
            <small>{originMeta}</small>
          </div>
          <form action={logout}>
            <button type="submit" className={styles.signout} aria-label="Sair">
              ⎋
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <p>
            Área de embarque <span aria-hidden="true">→</span> <strong>Painel de bordo</strong>
          </p>
          <p>
            <span aria-hidden="true" /> Base ativa · {originLabel}
          </p>
        </header>

        <div className={styles.content}>
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
                Abra uma viagem para rever paradas, translados propostos e quem já está na
                tripulação.
              </p>
              <div className={styles.heroActions}>
                <Link href="/app/viagens/nova" className={styles.primaryAction}>
                  Planejar nova viagem →
                </Link>
                {featuredTrip ? (
                  <Link href={`/app/viagens/${featuredTrip.id}`} className={styles.secondaryAction}>
                    Abrir {featuredTrip.destination_city} →
                  </Link>
                ) : null}
              </div>
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
                <Link href="/app/viagens/nova">+ Nova viagem</Link>
              </div>

              {trips.length > 0 ? (
                <ul className={styles.trips}>
                  {trips.map((trip, index) => (
                    <li key={trip.id}>
                      <Link href={`/app/viagens/${trip.id}`} className={styles.tripCard}>
                        <span className={styles.tripTopline}>
                          <span>Viagem {String(index + 1).padStart(2, "0")}</span>
                          <span>{ROLE_LABEL[trip.my_role]}</span>
                        </span>
                        <h3>{trip.name}</h3>
                        <span className={styles.tripRoute}>
                          {originLabel} → {trip.destination_city}
                        </span>
                        <span className={styles.tripProgress}>
                          {trip.stop_count} {trip.stop_count === 1 ? "parada" : "paradas"} na rota
                        </span>
                        <span className={styles.openTrip}>Abrir painel →</span>
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
                  A viagem é do grupo. A escolha é de cada pessoa — sem votação que decida por
                  alguém.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </div>

      <nav className={styles.mobileTabs} aria-label="Navegação principal">
        <span aria-current="page">
          <span aria-hidden="true">◈</span>
          Painel
        </span>
        <a href="#viagens">
          <span aria-hidden="true">⊞</span>
          Viagens
        </a>
        <Link href="/app/viagens/nova" className={styles.mobileCreate}>
          <span aria-hidden="true">+</span>
          Criar
        </Link>
        <a href="#convites">
          <span aria-hidden="true">✉</span>
          Convites
        </a>
      </nav>
    </main>
  );
}
