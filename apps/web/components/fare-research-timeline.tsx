"use client";

import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatTripDate, type Trajeto } from "@/lib/trips/backbone";
import {
  type FareResearch,
  type FareResearchDraft,
  fareResearchFromDraft,
  loadFareResearches,
  saveFareResearches,
  trajectoryKey,
} from "@/lib/trips/fare-research";
import { transferLabel } from "@/lib/trips/transfers";
import styles from "./fare-research.module.css";
import { FareResearchWizard } from "./fare-research-wizard";
import { TrajetoRow } from "./trajeto-row";

type ActiveResearch = {
  trajeto: Trajeto;
  trajectoryKey: string;
  existing?: FareResearch;
};

/**
 * Costura cliente entre a timeline real do backbone e as fichas locais de Pesquisa. Mantém cada
 * ficha sob o Trajeto que a originou, abre o wizard para criar/editar e isola o storage por Viagem.
 */
export function FareResearchTimeline({
  tripId,
  trajetos,
  className,
}: {
  tripId: string;
  trajetos: Trajeto[];
  className?: string;
}) {
  const [researches, setResearches] = useState<FareResearch[]>([]);
  const [active, setActive] = useState<ActiveResearch | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    setResearches(loadFareResearches(tripId));
  }, [tripId]);

  function persist(next: FareResearch[]) {
    setResearches(next);
    saveFareResearches(tripId, next);
  }

  function save(draft: FareResearchDraft) {
    if (!active) return;
    const id = active.existing?.id ?? createResearchId();
    const createdAt = active.existing?.createdAt;
    const research = fareResearchFromDraft(
      draft,
      active.trajectoryKey,
      id,
      createdAt ?? new Date().toISOString(),
    );
    const next = active.existing
      ? researches.map((item) => (item.id === id ? research : item))
      : [...researches, research];
    persist(next);
    setDeletingId(null);
    setAnnouncement(active.existing ? "Pesquisa atualizada." : "Pesquisa registrada.");
    setActive(null);
  }

  function remove(research: FareResearch) {
    persist(researches.filter((item) => item.id !== research.id));
    setDeletingId(null);
    setAnnouncement("Pesquisa removida.");
  }

  return (
    <>
      <ol className={className}>
        {trajetos.map((trajeto, index) => {
          const key = trajectoryKey(trajeto, index);
          const matches = researches.filter((research) => research.trajectoryKey === key);
          return (
            <TrajetoRow
              key={key}
              trajeto={trajeto}
              researchCount={matches.length}
              onAddResearch={() => setActive({ trajeto, trajectoryKey: key })}
            >
              {matches.length > 0 ? (
                <section className={styles.researchList} aria-label="Pesquisas registradas">
                  {matches.map((research, researchIndex) => (
                    <ResearchCard
                      key={research.id}
                      research={research}
                      index={researchIndex}
                      deletePending={deletingId === research.id}
                      onEdit={() => setActive({ trajeto, trajectoryKey: key, existing: research })}
                      onRequestRemove={() => setDeletingId(research.id)}
                      onCancelRemove={() => setDeletingId(null)}
                      onRemove={() => remove(research)}
                    />
                  ))}
                  <p className={styles.persistenceNote}>Fichas salvas neste navegador.</p>
                </section>
              ) : null}
            </TrajetoRow>
          );
        })}
      </ol>

      <output className="sr-only" aria-live="polite">
        {announcement}
      </output>

      {active ? (
        <FareResearchWizard
          key={`${active.trajectoryKey}:${active.existing?.id ?? "new"}`}
          trajeto={active.trajeto}
          existing={active.existing}
          onClose={() => setActive(null)}
          onSave={save}
        />
      ) : null}
    </>
  );
}

function ResearchCard({
  research,
  index,
  deletePending,
  onEdit,
  onRequestRemove,
  onCancelRemove,
  onRemove,
}: {
  research: FareResearch;
  index: number;
  deletePending: boolean;
  onEdit: () => void;
  onRequestRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
}) {
  const first = research.segments[0];
  const route =
    research.transferKind === "plane"
      ? `${first.originCode} → ${first.destinationCode}`
      : `${first.from} → ${first.to}`;
  const priceDimensions =
    research.money && research.points
      ? "dinheiro + pontos"
      : research.money
        ? "dinheiro"
        : "pontos";
  const kind =
    research.transferKind === "other"
      ? research.otherTransfer
      : transferLabel({ kind: research.transferKind });
  const date = formatTripDate(first.departureDate);
  const scope =
    research.segments.length > 1
      ? "ida e volta"
      : research.trajectoryKey.startsWith("volta-seed:")
        ? "só volta"
        : "só ida";

  return (
    <article className={styles.researchCard}>
      <header className={styles.researchCardHead}>
        <span className={styles.researchCardKicker}>
          Pesquisa {String(index + 1).padStart(2, "0")}
        </span>
        <span className={styles.researchType}>
          {kind} · {scope}
        </span>
      </header>
      <div className={styles.researchCardBody}>
        <div className={styles.researchIdentity}>
          <strong>{route}</strong>
          <span>
            {research.provider}
            {research.reference ? ` · ${research.reference}` : ""}
            {date ? ` · ${date}` : ""}
          </span>
        </div>
        <div className={styles.researchPrice}>
          <strong>{priceDimensions}</strong>
          <small>{research.priceBasis === "person" ? "por pessoa" : "por veículo / serviço"}</small>
        </div>
        <div className={styles.researchActions}>
          {deletePending ? (
            <fieldset className={styles.deleteConfirm}>
              <legend className="sr-only">Confirmar remoção</legend>
              <button type="button" onClick={onCancelRemove}>
                Cancelar
              </button>
              <button type="button" onClick={onRemove}>
                Remover
              </button>
            </fieldset>
          ) : (
            <>
              {research.link ? (
                <a
                  className={styles.iconButton}
                  href={research.link}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Abrir link da Pesquisa ${index + 1}`}
                >
                  <ExternalLink size={13} strokeWidth={1.5} aria-hidden="true" />
                </a>
              ) : null}
              <button
                type="button"
                className={styles.iconButton}
                onClick={onEdit}
                aria-label={`Editar Pesquisa ${index + 1}`}
              >
                <Pencil size={13} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={onRequestRemove}
                aria-label={`Remover Pesquisa ${index + 1}`}
              >
                <Trash2 size={13} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function createResearchId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `research-${Date.now()}`;
}
