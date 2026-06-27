import { CalendarDays, Ticket, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CrewRow } from "@/components/crew-row";
import { EmBreveCard } from "@/components/em-breve-card";
import { ProgressStrip } from "@/components/progress-strip";
import { TabChip } from "@/components/tab-chip";
import { TrajetoRow } from "@/components/trajeto-row";
import { Wordmark } from "@/components/wordmark";
import { apiFetch } from "@/lib/bff/server";
import {
  departureCountdown,
  deriveTrajetos,
  formatTripDate,
  summarizeSharedTransfers,
  type TripBackbone,
} from "@/lib/trips/backbone";
import styles from "./panel.module.css";

export const metadata: Metadata = {
  title: "Viagem · travel·manager",
};

/** Cascas V1 ainda não construídas (CONTEXT "Em breve"); repetem as tabs do topo no rail. */
const SOON_SHELLS = [
  { icon: CalendarDays, title: "Roteiro", note: "Dia a dia da viagem" },
  { icon: Wallet, title: "Orçamento", note: "Quem paga o quê" },
  { icon: Ticket, title: "Ingressos", note: "Atrações e reservas" },
] as const;

/**
 * Painel da Viagem — a home de _uma_ viagem, sobre o `TripBackboneRead` (`GET /trips/{id}`,
 * 404 → `notFound`, não vaza existência — ADR-0011). Server component honesto: só dado real.
 * Header + tabs · herói (partida + contagem de embarque) · avanço dos translados propostos ·
 * linha do tempo dos Trajetos (sua ida + compartilhados + sua volta-semente) · tripulação
 * (papel + convites cegos só para o Organizador) · cascas "em breve".
 */
export default async function ViagemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch(`/trips/${encodeURIComponent(id)}`);
  if (!res.ok) {
    notFound();
  }
  const trip = (await res.json()) as TripBackbone;

  const departureLabel = formatTripDate(trip.departure_date);
  // Gate na data já parseada (não na string crua): eyebrow e contador concordam mesmo
  // se um dia chegar uma data malformada (aí ambos caem em "datas a definir", sem duplicar).
  const countdown = departureLabel ? departureCountdown(trip.departure_date, new Date()) : null;
  const travelers = trip.crew.members.length;
  const route = trip.stops.map((stop) => stop.city).join(" → ");
  const progress = summarizeSharedTransfers(trip.stops);
  const trajetos = deriveTrajetos(trip);
  const isOrganizer = trip.my_role === "organizer";
  // Convite cego (ADR-0002): só o Organizador vê os pendentes — não vaze e-mail a membro.
  const pending = isOrganizer ? trip.crew.pending_invitations : [];

  return (
    <main className={styles.screen}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/app" className={styles.back}>
            <span aria-hidden="true">←</span> Minhas viagens
          </Link>
          <div className={styles.headerBar}>
            <Wordmark size={18} />
            <nav className={styles.tabs} aria-label="Seções da viagem">
              <TabChip state="active">Painel</TabChip>
              <TabChip state="soon">Roteiro</TabChip>
              <TabChip state="soon">Orçamento</TabChip>
              <TabChip state="soon">Ingressos</TabChip>
            </nav>
          </div>
        </header>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              {departureLabel ? `parte ${departureLabel}` : "datas a definir"}
            </p>
            <h1 className={styles.name}>{trip.name}</h1>
            <p className={styles.subtitle}>
              {route} · {travelers === 1 ? "1 viajante" : `${travelers} viajantes`}
            </p>
          </div>
          {countdown ? (
            <div className={styles.count}>
              <div className={styles.countNumber}>{countdown.number}</div>
              <div className={styles.countCaption}>{countdown.caption}</div>
            </div>
          ) : null}
        </section>

        {progress.total > 0 ? (
          <div className={styles.progress}>
            <ProgressStrip
              label={`${progress.proposed} de ${progress.total} ${
                progress.total === 1 ? "trajeto compartilhado" : "trajetos compartilhados"
              } com translado proposto`}
              value={progress.proposed}
              max={progress.total}
              openLabel={progress.open > 0 ? `${progress.open} em discussão` : null}
            />
          </div>
        ) : null}

        <div className={styles.grid}>
          <section>
            <h2 className={styles.colLabel}>Linha do tempo · seus trajetos</h2>
            <ol className={styles.timeline}>
              {trajetos.map((trajeto, i) => (
                <TrajetoRow key={`${trajeto.kind}-${i}`} trajeto={trajeto} />
              ))}
            </ol>
          </section>

          <aside>
            <section className={styles.railSection}>
              <h2 className={styles.colLabel}>Tripulação</h2>
              <ul className={styles.crew}>
                {trip.crew.members.map((member, i) => {
                  const organizes = member.role === "organizer";
                  const name = member.display_name?.trim() || "Tripulante";
                  return (
                    <CrewRow
                      // O contrato de `crew.members` não traz id; o índice (ordem estável do
                      // backbone) desempata iniciais+papel coincidentes.
                      key={`${member.initials}-${member.role}-${i}`}
                      initials={member.initials}
                      name={member.is_me ? `${name} (você)` : name}
                      meta={member.city}
                      status={organizes ? "organiza" : "membro"}
                      tone={organizes ? "accent" : "muted"}
                    />
                  );
                })}
              </ul>

              {pending.length > 0 ? (
                <>
                  <p className={styles.subLabel}>Aguardando aceite</p>
                  <ul className={styles.crew}>
                    {pending.map((invite) => (
                      <CrewRow
                        key={invite.id}
                        initials="?"
                        name={invite.email}
                        status="aguardando"
                        tone="warning"
                        blind
                      />
                    ))}
                  </ul>
                </>
              ) : null}
            </section>

            <section className={styles.railSection}>
              <h2 className={styles.colLabel}>Em breve nesta viagem</h2>
              <div className={styles.soonGroup}>
                {SOON_SHELLS.map((shell) => (
                  <EmBreveCard
                    key={shell.title}
                    icon={shell.icon}
                    title={shell.title}
                    note={shell.note}
                  />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <nav className={styles.switcher} aria-label="Vistas da viagem">
        <span className={`${styles.switcherItem} ${styles.switcherActive}`} aria-current="page">
          Painel
        </span>
        <span className={`${styles.switcherItem} ${styles.switcherSoon}`} aria-disabled="true">
          Rotas
          <span className="sr-only"> (em breve)</span>
        </span>
      </nav>
    </main>
  );
}
