"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { FareResearchTimeline } from "@/components/fare-research-timeline";
import type { MemberRead, PendingInvitation, Trajeto, TripBackbone } from "@/lib/trips/backbone";
import styles from "./panel.module.css";

type TripTab = "trajetos" | "tripulacao";
type ResearchSummary = { done: number; total: number };

type TripPanelProps = {
  trip: TripBackbone;
  trajetos: Trajeto[];
  departureLabel: string | null;
};

/** Painel da Viagem do redesign: abas no topo, timeline como foco e tripulação no rail. */
export function TripPanel({ trip, trajetos, departureLabel }: TripPanelProps) {
  const [tab, setTab] = useState<TripTab>("trajetos");
  const [researchSummary, setResearchSummary] = useState<ResearchSummary>({
    done: 0,
    total: trajetos.length,
  });
  const pending = trip.my_role === "organizer" ? trip.crew.pending_invitations : [];
  const me = trip.crew.members.find((member) => member.is_me);
  const roleLabel = trip.my_role === "organizer" ? "Organizador" : "Membro";
  const originCity = trip.origin.city?.trim() || "Sua origem";
  const routeParts = useMemo(
    () => [
      { key: "origin", label: originCity },
      ...trip.stops.map((stop) => ({ key: stop.id, label: stop.city })),
    ],
    [originCity, trip.stops],
  );
  const destination = routeParts.at(-1)?.label ?? "Destino";
  const progressPct =
    researchSummary.total > 0
      ? `${Math.round((researchSummary.done / researchSummary.total) * 100)}%`
      : "0%";
  const handleResearchSummary = useCallback((next: ResearchSummary) => {
    setResearchSummary(next);
  }, []);

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <nav className={styles.breadcrumb} aria-label="Caminho">
          <Link href="/app">Painel de bordo</Link>
          <span aria-hidden="true">→</span>
          <span>{trip.name}</span>
        </nav>

        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <span aria-hidden="true" />
              {roleLabel} · partida {originCity}
            </span>
            <h1>{trip.name}</h1>
            <p className={styles.routeLine}>
              {routeParts.slice(0, -1).map((node) => (
                <span key={node.key}>
                  {node.label}
                  <span aria-hidden="true"> → </span>
                </span>
              ))}
              <span className={styles.destination}>{destination} ★</span>
              <span aria-hidden="true"> · </span>
              {routeParts.length} cidades · {trajetos.length} trajetos
            </p>
            {departureLabel ? <p className={styles.departure}>Parte {departureLabel}</p> : null}
          </div>

          <div className={styles.progressBox}>
            <div>
              <span>Translados pesquisados</span>
              <strong>
                {researchSummary.done}
                <small> / {researchSummary.total}</small>
              </strong>
            </div>
            <span className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: progressPct }} />
            </span>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={tab === "trajetos" ? styles.tabActive : ""}
            aria-current={tab === "trajetos" ? "page" : undefined}
            onClick={() => setTab("trajetos")}
          >
            Trajetos
          </button>
          <button
            type="button"
            className={tab === "tripulacao" ? styles.tabActive : ""}
            aria-current={tab === "tripulacao" ? "page" : undefined}
            onClick={() => setTab("tripulacao")}
          >
            Tripulação
          </button>
          <span className={styles.soonTabs}>
            Roteiro · Orçamento · Ingressos <em>em breve</em>
          </span>
        </div>
      </header>

      <div className={styles.body}>
        <section className={styles.mainPane}>
          {tab === "trajetos" ? (
            <>
              <div className={styles.sectionHead}>
                <h2>A linha dos trajetos</h2>
                <span>Pesquisas e preferidas · por pessoa</span>
              </div>
              <FareResearchTimeline
                tripId={trip.id}
                tripName={trip.name}
                trajetos={trajetos}
                currentUserInitials={me?.initials ?? "V"}
                className={styles.timeline}
                onSummaryChange={handleResearchSummary}
              />
            </>
          ) : (
            <CrewGrid members={trip.crew.members} pending={pending} />
          )}
        </section>

        <aside className={styles.rail} aria-label="Tripulação">
          <section>
            <div className={styles.railHead}>
              <span>Tripulação</span>
              <small>
                {trip.crew.members.length}
                {pending.length > 0 ? ` + ${pending.length}` : ""}
              </small>
            </div>
            <div className={styles.railCrew}>
              {trip.crew.members.map((member, index) => (
                <CrewMini key={`${member.initials}-${member.role}-${index}`} member={member} />
              ))}
              {pending.map((invite) => (
                <PendingMini key={invite.id} invite={invite} />
              ))}
            </div>
          </section>

          <section className={styles.note}>
            <span>Nota de bordo</span>
            <p>
              A viagem é do grupo. A preferida é de cada pessoa — todo mundo enxerga a de todo
              mundo, sem voto que decida por alguém.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function CrewGrid({ members, pending }: { members: MemberRead[]; pending: PendingInvitation[] }) {
  return (
    <>
      <div className={styles.sectionHead}>
        <h2>Tripulação a bordo</h2>
        <span>Cada um decide a própria preferida</span>
      </div>
      <div className={styles.crewGrid}>
        {members.map((member, index) => (
          <CrewCard key={`${member.initials}-${member.role}-${index}`} member={member} />
        ))}
      </div>
      {pending.map((invite) => (
        <article className={styles.pendingCard} key={invite.id}>
          <span>?</span>
          <div>
            <strong>{maskEmail(invite.email)}</strong>
            <small>Convite enviado · aguardando aceite</small>
          </div>
          <em>Pendente</em>
        </article>
      ))}
    </>
  );
}

function CrewCard({ member }: { member: MemberRead }) {
  const organizer = member.role === "organizer";
  const name = member.display_name?.trim() || "Tripulante";
  return (
    <article className={styles.crewCard}>
      <span className={organizer ? styles.avatarAccent : ""}>{member.initials}</span>
      <div>
        <strong>{member.is_me ? `${name} · você` : name}</strong>
        <small>
          {organizer ? "Organizadora" : "Membro"} ·{" "}
          {member.is_me ? "Preferida em aberto" : "Sem preferida ainda"}
        </small>
      </div>
    </article>
  );
}

function CrewMini({ member }: { member: MemberRead }) {
  const organizer = member.role === "organizer";
  const name = member.display_name?.trim() || "Tripulante";
  return (
    <div className={styles.crewMini}>
      <span className={organizer ? styles.avatarAccent : ""}>{member.initials}</span>
      <div>
        <strong>{member.is_me ? `${name} · você` : name}</strong>
        <small>{organizer ? "Organizadora" : "Membro"}</small>
      </div>
    </div>
  );
}

function PendingMini({ invite }: { invite: PendingInvitation }) {
  return (
    <div className={styles.crewMini}>
      <span className={styles.avatarWarning}>?</span>
      <div>
        <strong>{maskEmail(invite.email)}</strong>
        <small>Aguardando aceite</small>
      </div>
    </div>
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "convite pendente";
  const prefix = local.slice(0, 2);
  return `${prefix}${"•".repeat(5)}@${domain}`;
}
