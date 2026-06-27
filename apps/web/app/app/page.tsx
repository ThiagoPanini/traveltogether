import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPinned,
  Plane,
  Plus,
  Route,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { Wordmark } from "@/components/wordmark";
import { apiFetch } from "@/lib/bff/server";
import { logout } from "./actions";
import styles from "./app.module.css";
import { type PendingInvitation, PendingInvitations } from "./pending-invitations";

export const metadata: Metadata = {
  title: "Painel de bordo · travel·manager",
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
const RADAR_POINT_STYLES = [styles.radarPointOne, styles.radarPointTwo, styles.radarPointThree];

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
 * Painel de bordo da área logada. Resume as Participações do usuário, mantém os
 * Convites pendentes acionáveis e leva para o detalhe de cada Viagem sem inventar
 * dados da camada de exploração que ainda não existem.
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
  const firstName = nameLabel.split(/\s+/)[0];
  const initial = nameLabel[0]?.toUpperCase() || "V";
  const totalStops = trips.reduce((total, trip) => total + trip.stop_count, 0);
  const organizerCount = trips.filter((trip) => trip.my_role === "organizer").length;
  const hasTrips = trips.length > 0;

  return (
    <main className={styles.screen}>
      <aside className={styles.sidebar} aria-label="Menu principal">
        <Link href="/app" className={styles.brand} aria-label="travelmanager — painel">
          <Wordmark size={17} pulse />
        </Link>

        <nav className={styles.primaryNav} aria-label="Navegação do painel">
          <Link
            href="/app"
            className={`${styles.navItem} ${styles.navItemActive}`}
            aria-current="page"
          >
            <LayoutDashboard size={17} strokeWidth={1.7} aria-hidden="true" />
            <span>Painel</span>
            <span className={styles.navIndex} aria-hidden="true">
              01
            </span>
          </Link>
          <a href="#viagens" className={styles.navItem}>
            <MapPinned size={17} strokeWidth={1.7} aria-hidden="true" />
            <span>Minhas viagens</span>
            <span className={styles.navCount}>{trips.length}</span>
          </a>
          {invitations.length > 0 ? (
            <a href="#convites" className={styles.navItem}>
              <Mail size={17} strokeWidth={1.7} aria-hidden="true" />
              <span>Convites</span>
              <span className={`${styles.navCount} ${styles.navCountAlert}`}>
                {invitations.length}
              </span>
            </a>
          ) : null}
        </nav>

        <Link href="/app/viagens/nova" className={styles.sidebarCta}>
          <Plus size={17} strokeWidth={2} aria-hidden="true" />
          <span>Nova viagem</span>
        </Link>

        <div className={styles.sidebarSpacer} />

        <div className={styles.profileCard}>
          <div className={styles.avatar} aria-hidden="true">
            {initial}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{nameLabel}</span>
            <span className={styles.userCity}>{originCity || "Origem a definir"}</span>
          </div>
          <form action={logout} className={styles.signoutForm}>
            <button type="submit" className={styles.signout} aria-label="Sair">
              <LogOut size={16} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <p className={styles.breadcrumb}>
            <span>Área de embarque</span>
            <ArrowRight size={12} strokeWidth={1.5} aria-hidden="true" />
            <strong>Painel de bordo</strong>
          </p>
          <p className={styles.baseStatus}>
            <span className={styles.liveDot} aria-hidden="true" />
            Base ativa · {originCity || "origem a definir"}
          </p>
        </header>

        <div className={styles.content}>
          <section className={styles.hero} aria-labelledby="dashboard-title">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Olá, {firstName} · tudo a bordo</p>
              <h1 id="dashboard-title">
                {hasTrips ? (
                  <>
                    Seu mapa está <em>em movimento.</em>
                  </>
                ) : (
                  <>
                    O mundo cabe no <em>próximo plano.</em>
                  </>
                )}
              </h1>
              <p className={styles.heroDescription}>
                {hasTrips
                  ? "Abra uma Viagem para rever Paradas, translados propostos e quem já está na Tripulação."
                  : "Crie o primeiro esqueleto da jornada, convide o grupo e tracem as Paradas cidade a cidade."}
              </p>
              <div className={styles.heroActions}>
                <Link href="/app/viagens/nova" className={styles.primaryAction}>
                  Planejar nova viagem
                  <ArrowUpRight size={17} strokeWidth={2} aria-hidden="true" />
                </Link>
                {hasTrips ? (
                  <a href="#viagens" className={styles.secondaryAction}>
                    Ver minhas viagens
                    <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className={styles.radar} aria-hidden="true">
              <span className={styles.radarLabel}>Mapa esquemático</span>
              <span className={`${styles.radarRing} ${styles.radarRingOuter}`} />
              <span className={`${styles.radarRing} ${styles.radarRingInner}`} />
              <span className={styles.radarCrossHorizontal} />
              <span className={styles.radarCrossVertical} />
              <span className={styles.radarSweep} />
              <span className={styles.radarPlane}>
                <Plane size={23} strokeWidth={1.6} />
              </span>
              {(hasTrips ? trips.slice(0, 3) : [{ destination_city: "Destino" }]).map(
                (trip, index) => (
                  <span
                    key={`${trip.destination_city}-${index}`}
                    className={`${styles.radarPoint} ${RADAR_POINT_STYLES[index]}`}
                  >
                    <span>{trip.destination_city}</span>
                  </span>
                ),
              )}
            </div>

            <dl className={styles.metrics} aria-label="Resumo do painel">
              <div className={styles.metric}>
                <dt>Viagens no radar</dt>
                <dd>{String(trips.length).padStart(2, "0")}</dd>
              </div>
              <div className={styles.metric}>
                <dt>Paradas mapeadas</dt>
                <dd>{String(totalStops).padStart(2, "0")}</dd>
              </div>
              <div className={styles.metric}>
                <dt>Como organizador</dt>
                <dd>{String(organizerCount).padStart(2, "0")}</dd>
              </div>
              <div className={styles.metric}>
                <dt>Convites na fila</dt>
                <dd>{String(invitations.length).padStart(2, "0")}</dd>
              </div>
            </dl>
          </section>

          {invitations.length > 0 ? <PendingInvitations invitations={invitations} /> : null}

          <div className={styles.dashboardGrid}>
            <section id="viagens" className={styles.tripsSection} aria-labelledby="trips-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionKicker}>Caderno de bordo · Participações</p>
                  <h2 id="trips-title">Minhas viagens</h2>
                </div>
                {hasTrips ? (
                  <Link href="/app/viagens/nova" className={styles.textAction}>
                    Nova viagem
                    <Plus size={15} strokeWidth={2} aria-hidden="true" />
                  </Link>
                ) : null}
              </div>

              {hasTrips ? (
                <ul className={styles.trips}>
                  {trips.map((trip, index) => (
                    <li key={trip.id} className={index === 0 ? styles.featuredTrip : undefined}>
                      <Link href={`/app/viagens/${trip.id}`} className={styles.tripCard}>
                        <span className={styles.tripTopline}>
                          <span>Viagem / {String(index + 1).padStart(2, "0")}</span>
                          <span className={styles.rolePill}>{ROLE_LABEL[trip.my_role]}</span>
                        </span>

                        <span className={styles.tripRoute} aria-hidden="true">
                          <span className={styles.routeCity}>{originCity || "Sua base"}</span>
                          <span className={styles.routeTrack}>
                            <span className={styles.routePlane}>
                              <Plane size={13} strokeWidth={1.8} />
                            </span>
                          </span>
                          <span className={styles.routeCity}>{trip.destination_city}</span>
                        </span>

                        <span className={styles.destinationLabel}>Destino</span>
                        <span className={styles.destination}>{trip.destination_city}</span>
                        <span className={styles.tripName}>{trip.name}</span>

                        <span className={styles.tripFooter}>
                          <span>
                            {trip.stop_count} {trip.stop_count === 1 ? "Parada" : "Paradas"}
                          </span>
                          <span className={styles.openTrip}>
                            Abrir painel
                            <ArrowUpRight size={15} strokeWidth={1.9} aria-hidden="true" />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.emptyBoard}>
                  <div className={styles.emptyTicket}>
                    <span className={styles.emptyNumber}>00</span>
                    <span className={styles.emptyRoute} aria-hidden="true">
                      <span />
                      <Route size={22} strokeWidth={1.4} />
                      <span />
                    </span>
                    <p className={styles.emptyKicker}>Manifesto aberto · aguardando destino</p>
                    <h3>Nenhuma viagem no radar — ainda.</h3>
                    <p>
                      A primeira Viagem organiza destino, Paradas, membros e um período aproximado.
                      O resto ganha forma junto com o grupo.
                    </p>
                    <Link href="/app/viagens/nova" className={styles.primaryAction}>
                      Criar primeira viagem
                      <ArrowUpRight size={17} strokeWidth={2} aria-hidden="true" />
                    </Link>
                  </div>
                  <ol className={styles.firstSteps} aria-label="Etapas da criação de uma viagem">
                    <li>
                      <span>01</span>
                      <strong>Escolha o destino</strong>
                      <small>A última Parada da sequência.</small>
                    </li>
                    <li>
                      <span>02</span>
                      <strong>Trace as Paradas</strong>
                      <small>O esqueleto compartilhado da jornada.</small>
                    </li>
                    <li>
                      <span>03</span>
                      <strong>Chame a Tripulação</strong>
                      <small>Cada pessoa entra ao aceitar o Convite.</small>
                    </li>
                  </ol>
                </div>
              )}
            </section>

            <aside className={styles.logbook} aria-labelledby="logbook-title">
              <div className={styles.logbookTopline}>
                <span>Nota de navegação</span>
                <Compass size={18} strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div className={styles.logbookStamp} aria-hidden="true">
                TM
                <span>✦</span>
              </div>
              <h2 id="logbook-title">A viagem é do grupo. A escolha é de cada pessoa.</h2>
              <p>
                Todo mundo pode explorar caminhos e compartilhar Pesquisas. Depois, cada viajante
                marca a própria Preferida — sem votação que decida por alguém.
              </p>
              <dl className={styles.logbookFacts}>
                <div>
                  <dt>Sua origem-base</dt>
                  <dd>{originCity || "Ainda não definida"}</dd>
                </div>
                <div>
                  <dt>{hasTrips ? "Papel mais frequente" : "Estado do caderno"}</dt>
                  <dd>
                    {hasTrips
                      ? organizerCount >= trips.length - organizerCount
                        ? "Organizador"
                        : "Membro"
                      : "Primeiro embarque"}
                  </dd>
                </div>
              </dl>
              <div className={styles.logbookMark} aria-hidden="true">
                travelmanager · caderno compartilhado
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
