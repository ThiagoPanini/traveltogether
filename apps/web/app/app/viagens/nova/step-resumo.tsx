"use client";

import { Pencil } from "lucide-react";
import { getDestination } from "@/lib/trips/draft";
import { transferLabel } from "@/lib/trips/transfers";
import { RouteBand } from "./route-band";
import { TransferIcon } from "./transfer-icons";
import styles from "./wizard.module.css";
import type { StepProps } from "./wizard-types";
import { originLabel } from "./wizard-types";

const ROLE_LABEL = { member: "Membro", organizer: "Organizador" } as const;

/**
 * Passo 6 — Resumo (boarding-pass). Recap read-only com "editar" por seção (linka pro
 * passo certo preservando o rascunho). Faixa-itinerário horizontal como herói + "em
 * números" + lista de trajetos com ícone. Legenda honesta: translados são propostas,
 * cada pessoa pesquisa e decide a sua. O Confirmar (POST atômico) mora no rodapé.
 */
export function StepResumo({ draft, dispatch, origin }: StepProps) {
  const dest = getDestination(draft);
  const airLegs =
    (draft.entryTransfer?.kind === "plane" ? 1 : 0) +
    draft.stops.slice(1).filter((s) => s.desiredTransfer?.kind === "plane").length;

  // Trajetos como lista linear: ida pessoal + saltos compartilhados.
  const legs = draft.stops.map((stop, i) => ({
    id: stop.id,
    from: i === 0 ? originLabel(origin) : draft.stops[i - 1].city.trim() || "Parada",
    to: stop.city.trim() || (i === draft.stops.length - 1 ? "Destino" : `Parada ${i + 1}`),
    transfer: i === 0 ? draft.entryTransfer : stop.desiredTransfer,
  }));

  function EditBtn({ step }: { step: number }) {
    return (
      <button
        type="button"
        className={styles.editBtn}
        onClick={() => dispatch({ type: "setStep", step })}
      >
        <Pencil size={13} strokeWidth={1.5} aria-hidden="true" /> Editar
      </button>
    );
  }

  return (
    <div className={styles.single}>
      <header className={styles.sectionHead}>
        <p className={styles.eyebrow}>Passo 06 · Resumo</p>
        <h1 className={styles.title}>Confiram o embarque</h1>
        <p className={styles.lede}>
          A viagem inteira antes de criar. Toque em "editar" pra voltar a qualquer passo — nada se
          perde.
        </p>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroHead}>
          <h2 className={styles.heroName}>{draft.name.trim() || "Sem nome ainda"}</h2>
          <EditBtn step={4} />
        </div>
        {draft.description.trim() ? (
          <p className={styles.heroDesc}>{draft.description.trim()}</p>
        ) : null}
        <RouteBand origin={origin} stops={draft.stops} entryTransfer={draft.entryTransfer} />
      </div>

      <div className={styles.numbers}>
        <div className={styles.numberCard}>
          <span className={styles.numberValue}>{draft.stops.length + 1}</span>
          <span className={styles.numberLabel}>Cidades</span>
        </div>
        <div className={styles.numberCard}>
          <span className={styles.numberValue}>{draft.stops.length}</span>
          <span className={styles.numberLabel}>Trajetos</span>
        </div>
        <div className={styles.numberCard}>
          <span className={styles.numberValue}>{airLegs}</span>
          <span className={styles.numberLabel}>Trechos aéreos</span>
        </div>
      </div>

      <div className={styles.summary}>
        <section className={styles.section}>
          <div className={styles.sectionRow}>
            <span className={styles.sectionTitle}>Rota</span>
            <EditBtn step={2} />
          </div>
          <ul className={styles.summaryList}>
            <li className={styles.summaryRow}>
              <span className={styles.kicker}>Origem · você</span>
              <span>{originLabel(origin)}</span>
            </li>
            {draft.stops.map((stop, i) => {
              const isDest = stop.id === dest.id;
              return (
                <li key={stop.id} className={styles.summaryRow}>
                  <span className={styles.kicker}>{isDest ? "Destino" : `Parada ${i + 1}`}</span>
                  <span>{stop.city.trim() || "—"}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionRow}>
            <span className={styles.sectionTitle}>Translados</span>
            <EditBtn step={3} />
          </div>
          <ul className={styles.legList}>
            {legs.map((leg, i) => (
              <li key={leg.id} className={styles.legRow}>
                <span className={styles.legRowIcon} aria-hidden="true">
                  <TransferIcon transfer={leg.transfer} size={18} />
                </span>
                <span className={styles.legRowCities}>
                  {leg.from} → {leg.to}
                </span>
                <span className={styles.legRowMode}>
                  {i === 0
                    ? `${transferLabel(leg.transfer)} · por pessoa`
                    : transferLabel(leg.transfer)}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.legend}>
            Translados são propostas, não compras. Cada pessoa pesquisa e decide a sua depois — o
            app só alinha o grupo.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionRow}>
            <span className={styles.sectionTitle}>Tripulação</span>
            <EditBtn step={5} />
          </div>
          {draft.invitations.length > 0 ? (
            <ul className={styles.summaryList}>
              <li className={styles.summaryRow}>
                <span>Você</span>
                <span className={styles.summaryMeta}>Organizador</span>
              </li>
              {draft.invitations.map((invite) => (
                <li key={invite.email} className={styles.summaryRow}>
                  <span>{invite.email}</span>
                  <span className={styles.summaryMeta}>{ROLE_LABEL[invite.role]} · pendente</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.heroDesc}>Só você por enquanto — dá pra convidar depois.</p>
          )}
        </section>
      </div>
    </div>
  );
}
