import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/bff/server";
import type { TransferKind } from "@/lib/trips/draft";
import { isTransferDefined, transferLabel } from "@/lib/trips/transfers";
import styles from "./backbone.module.css";

export const metadata: Metadata = {
  title: "Viagem · travel·manager",
};

type TransferOut = { kind: TransferKind; other_text: string | null } | null;

type Backbone = {
  id: string;
  name: string;
  description: string | null;
  departure_date: string | null;
  my_role: "organizer" | "member";
  origin: { city: string | null; country: string | null };
  entry_transfer: TransferOut;
  stops: {
    id: string;
    position: number;
    city: string;
    country: string | null;
    arrival_date: string | null;
    desired_transfer: TransferOut;
  }[];
  crew: {
    members: {
      display_name: string | null;
      initials: string;
      city: string | null;
      role: "organizer" | "member";
      is_me: boolean;
    }[];
    pending_invitations: { id: string; email: string; role: "organizer" | "member" }[];
  };
};

const ROLE_LABEL = { member: "Membro", organizer: "Organizador" } as const;

/** Converte o translado do payload (snake) para o rótulo da UI. */
function label(transfer: TransferOut): string {
  if (!transfer) return "Indefinido";
  return transferLabel({ kind: transfer.kind, otherText: transfer.other_text ?? undefined });
}

function defined(transfer: TransferOut): boolean {
  return isTransferDefined(transfer ? { kind: transfer.kind } : null);
}

/**
 * Tela de backbone da Viagem (Fase 3). Server component: lê `/trips/{id}` (404 →
 * `trip_not_found`, não vaza existência — ADR-0011). Mostra rota (origem derivada do
 * Perfil de quem vê → paradas → destino), translados propostos (a ida marcada como
 * pessoal), tripulação (membros aceitos com bloco rico; convites pendentes cegos) e a
 * legenda honesta. Engrossa nas fatias seguintes.
 */
export default async function ViagemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch(`/trips/${encodeURIComponent(id)}`);
  if (!res.ok) {
    notFound();
  }
  const trip = (await res.json()) as Backbone;
  const originCity = trip.origin.city?.trim() || "Sua cidade";
  const lastIndex = trip.stops.length - 1;

  return (
    <main className={styles.screen}>
      <header className={styles.top}>
        <Link href="/app" className={styles.back}>
          ← Minhas viagens
        </Link>
        <span className={styles.roleTag}>{ROLE_LABEL[trip.my_role]}</span>
      </header>

      <div className={styles.shell}>
        <div>
          <p className={styles.eyebrow}>Esqueleto da viagem</p>
          <h1 className={styles.name}>{trip.name}</h1>
          {trip.description ? <p className={styles.description}>{trip.description}</p> : null}
        </div>

        <section>
          <h2 className={styles.sectionTitle}>Rota</h2>
          <ul className={styles.trail}>
            <li className={styles.stop}>
              <span className={`${styles.dot} ${styles.dotOrigin}`} aria-hidden="true" />
              <span className={styles.stopBody}>
                <span className={`${styles.kicker} ${styles.kickerAccent}`}>Origem · Você</span>
                <span className={styles.city}>{originCity}</span>
                {trip.departure_date ? (
                  <span className={styles.stopMeta}>parte {trip.departure_date}</span>
                ) : null}
              </span>
            </li>

            {trip.stops.map((stop, i) => {
              const personal = i === 0;
              const hop = personal ? trip.entry_transfer : stop.desired_transfer;
              const isDest = i === lastIndex;
              return (
                <li key={stop.id} style={{ display: "contents" }}>
                  <div className={styles.leg}>
                    <span
                      className={`${styles.legLine} ${defined(hop) ? styles.legLineDefined : ""}`}
                      aria-hidden="true"
                    />
                    <span>
                      <span className={styles.legLabel}>{label(hop)}</span>
                      <span className={styles.legMeta}>
                        {personal ? "sua ida · por pessoa" : "translado proposto"}
                      </span>
                    </span>
                  </div>
                  <div className={styles.stop}>
                    <span
                      className={`${styles.dot} ${isDest ? styles.dotDest : ""}`}
                      aria-hidden="true"
                    />
                    <span className={styles.stopBody}>
                      <span className={`${styles.kicker} ${isDest ? styles.kickerAccent : ""}`}>
                        {isDest ? "Destino final" : `Parada ${i + 1}`}
                      </span>
                      <span className={styles.city}>{stop.city}</span>
                      {stop.arrival_date ? (
                        <span className={styles.stopMeta}>chega {stop.arrival_date}</span>
                      ) : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>Tripulação</h2>
          <ul className={styles.crew}>
            {trip.crew.members.map((member, i) => (
              // O contrato de `crew.members` não traz id por membro; o índice (ordem
              // estável do backbone) desempata iniciais+papel coincidentes.
              <li key={`${member.initials}-${member.role}-${i}`} className={styles.member}>
                <span className={styles.avatar} aria-hidden="true">
                  {member.initials}
                </span>
                <span className={styles.memberInfo}>
                  <span className={styles.memberName}>
                    {member.display_name || "Tripulante"}
                    {member.is_me ? " (você)" : ""}
                  </span>
                  {member.city ? <span className={styles.memberCity}>{member.city}</span> : null}
                </span>
                <span
                  className={`${styles.badge} ${member.role === "organizer" ? styles.badgeOrganizer : ""}`}
                >
                  {ROLE_LABEL[member.role]}
                </span>
              </li>
            ))}

            {trip.crew.pending_invitations.map((invite) => (
              <li key={invite.id} className={styles.member}>
                <span className={`${styles.avatar} ${styles.avatarBlind}`} aria-hidden="true">
                  ?
                </span>
                <span className={styles.memberInfo}>
                  <span className={styles.memberName}>{invite.email}</span>
                </span>
                <span className={`${styles.badge} ${styles.badgePending}`}>Pendente</span>
              </li>
            ))}
          </ul>
        </section>

        <p className={styles.legend}>
          Os translados são propostas, não compras — cada pessoa pesquisa e decide a sua depois. O
          app só alinha o grupo.
        </p>
      </div>
    </main>
  );
}
