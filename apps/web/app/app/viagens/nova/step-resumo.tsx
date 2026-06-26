"use client";

import { getDestination } from "@/lib/trips/draft";
import { transferLabel } from "@/lib/trips/transfers";
import { RouteBand } from "./route-band";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";
import { originLabel } from "./wizard-types";

const ROLE_LABEL = { member: "Membro", organizer: "Organizador" } as const;

/**
 * Passo 6 — Resumo (boarding-pass). Recap read-only com "editar" por seção (linka pro
 * passo certo preservando o rascunho). Faixa-itinerário horizontal como herói. Legenda
 * honesta: translados são propostas, cada pessoa pesquisa e decide a sua. O Confirmar
 * (POST atômico) mora na navegação do wizard.
 */
export function StepResumo({ draft, dispatch, origin }: StepProps) {
  const dest = getDestination(draft);

  function Section({
    title,
    step,
    children,
  }: {
    title: string;
    step: number;
    children: React.ReactNode;
  }) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>{title}</span>
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => dispatch({ type: "setStep", step })}
          >
            Editar
          </button>
        </div>
        {children}
      </section>
    );
  }

  return (
    <div>
      <p className={styles.eyebrow}>Passo 6 · Resumo</p>
      <h1 className={styles.title}>Confiram o embarque</h1>
      <p className={styles.lede}>
        A viagem inteira antes de criar. Toque em "editar" pra voltar a qualquer passo — nada se
        perde.
      </p>

      <div style={{ marginBottom: 16 }}>
        <RouteBand origin={origin} stops={draft.stops} entryTransfer={draft.entryTransfer} />
      </div>

      <div className={styles.summary}>
        <Section title="Identidade" step={4}>
          <h2 className={styles.summaryName}>{draft.name.trim() || "Sem nome ainda"}</h2>
          {draft.description.trim() ? (
            <p className={styles.summaryDesc}>{draft.description.trim()}</p>
          ) : null}
        </Section>

        <Section title="Rota" step={2}>
          <ul className={styles.summaryList}>
            <li className={styles.summaryRow}>
              <span className={styles.kicker}>Origem · Você</span>
              <span>{originLabel(origin)}</span>
              {draft.departureDate ? (
                <span className={styles.summaryMeta}>parte {draft.departureDate}</span>
              ) : null}
            </li>
            {draft.stops.map((stop, i) => {
              const isDest = stop.id === dest.id;
              return (
                <li key={stop.id} className={styles.summaryRow}>
                  <span className={styles.kicker}>{isDest ? "Destino" : `Parada ${i + 1}`}</span>
                  <span>{stop.city.trim() || "—"}</span>
                  {stop.arrivalDate ? (
                    <span className={styles.summaryMeta}>chega {stop.arrivalDate}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Translados" step={3}>
          <ul className={styles.summaryList}>
            <li className={styles.summaryRow}>
              <span>Sua ida</span>
              <span className={styles.summaryMeta}>
                {transferLabel(draft.entryTransfer)} · por pessoa
              </span>
            </li>
            {draft.stops.slice(1).map((stop, i) => (
              <li key={stop.id} className={styles.summaryRow}>
                <span>
                  {draft.stops[i].city.trim() || "Parada"} → {stop.city.trim() || "Parada"}
                </span>
                <span className={styles.summaryMeta}>{transferLabel(stop.desiredTransfer)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.legend}>
            Translados são propostas, não compras. Cada pessoa pesquisa e decide a sua depois — o
            app só alinha o grupo.
          </p>
        </Section>

        <Section title="Tripulação" step={5}>
          {draft.invitations.length > 0 ? (
            <ul className={styles.summaryList}>
              {draft.invitations.map((invite) => (
                <li key={invite.email} className={styles.summaryRow}>
                  <span>{invite.email}</span>
                  <span className={styles.summaryMeta}>{ROLE_LABEL[invite.role]} · pendente</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.summaryDesc}>Só você por enquanto — dá pra convidar depois.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
