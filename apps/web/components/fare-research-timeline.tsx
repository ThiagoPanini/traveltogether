"use client";

import { useEffect, useMemo, useState } from "react";
import type { Trajeto } from "@/lib/trips/backbone";
import {
  type FareResearch,
  type FareResearchDraft,
  fareResearchFromDraft,
  formatResearchMoney,
  formatResearchPoints,
  loadFareResearches,
  saveFareResearches,
  trajectoryKey,
} from "@/lib/trips/fare-research";
import { transferLabel } from "@/lib/trips/transfers";
import styles from "./fare-research.module.css";
import { FareResearchWizard } from "./fare-research-wizard";

type ActiveResearch = {
  trajeto: Trajeto;
  trajectoryKey: string;
  index: number;
};

type ResearchSummary = {
  done: number;
  total: number;
};

type FareResearchTimelineProps = {
  tripId: string;
  tripName?: string;
  trajetos: Trajeto[];
  currentUserInitials?: string;
  className?: string;
  onSummaryChange?: (summary: ResearchSummary) => void;
};

/** Timeline cliente dos Trajetos pesquisáveis, espelhando o painel redesenhado. */
export function FareResearchTimeline({
  tripId,
  tripName = "Viagem",
  trajetos,
  currentUserInitials = "V",
  className,
  onSummaryChange,
}: FareResearchTimelineProps) {
  const [researches, setResearches] = useState<FareResearch[]>([]);
  const [preferredIds, setPreferredIds] = useState<Set<string>>(() => new Set());
  const [active, setActive] = useState<ActiveResearch | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const grouped = useMemo(
    () =>
      trajetos.map((trajeto, index) => {
        const key = trajectoryKey(trajeto, index);
        return {
          key,
          trajeto,
          items: researches.filter((research) => research.trajectoryKey === key),
        };
      }),
    [researches, trajetos],
  );

  useEffect(() => {
    setResearches(loadFareResearches(tripId));
  }, [tripId]);

  useEffect(() => {
    onSummaryChange?.({
      done: grouped.filter((group) => group.items.length > 0).length,
      total: trajetos.length,
    });
  }, [grouped, onSummaryChange, trajetos.length]);

  function persist(next: FareResearch[]) {
    setResearches(next);
    saveFareResearches(tripId, next);
  }

  function save(draft: FareResearchDraft) {
    if (!active) return;
    const id = createResearchId();
    const research = fareResearchFromDraft(draft, active.trajectoryKey, id);
    persist([...researches, research]);
    setPreferredIds((current) => {
      const next = new Set(current);
      if (!researches.some((item) => item.trajectoryKey === active.trajectoryKey)) {
        next.add(id);
      }
      return next;
    });
    setAnnouncement("Pesquisa registrada.");
    setActive(null);
  }

  function togglePreferred(research: FareResearch) {
    setPreferredIds((current) => {
      const next = new Set(current);
      const sameTrajectory = researches
        .filter((item) => item.trajectoryKey === research.trajectoryKey)
        .map((item) => item.id);
      for (const id of sameTrajectory) next.delete(id);
      if (!current.has(research.id)) next.add(research.id);
      return next;
    });
  }

  if (trajetos.length === 0) {
    return (
      <div className={className}>
        <div className={styles.emptyResearch}>Sem trajetos nesta viagem.</div>
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        {grouped.map(({ key, trajeto, items }, index) => {
          const count = items.length;
          const preferredCount = items.filter((research) => preferredIds.has(research.id)).length;
          return (
            <section className={styles.legCard} key={key}>
              <header className={styles.legHead}>
                <span>
                  Trajeto {index + 1} de {trajetos.length}
                </span>
                <strong>
                  {trajeto.from} <span aria-hidden="true">→</span> {trajeto.to}
                </strong>
                <em>{scopeLabel(trajeto)}</em>
              </header>

              <div className={styles.legBody}>
                {items.length > 0 ? (
                  items.map((research) => (
                    <ResearchCard
                      key={research.id}
                      research={research}
                      initials={currentUserInitials}
                      preferred={preferredIds.has(research.id)}
                      onTogglePreferred={() => togglePreferred(research)}
                    />
                  ))
                ) : (
                  <div className={styles.emptyResearch}>
                    Sem pesquisas ainda · sejam os primeiros
                  </div>
                )}

                <div className={styles.legFoot}>
                  <span>{countLabel(count, preferredCount)}</span>
                  <button
                    type="button"
                    onClick={() => setActive({ trajeto, trajectoryKey: key, index })}
                  >
                    + Pesquisar translado
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <output className="sr-only" aria-live="polite">
        {announcement}
      </output>

      {active ? (
        <FareResearchWizard
          key={active.trajectoryKey}
          tripName={tripName}
          trajeto={active.trajeto}
          trajectoryIndex={active.index + 1}
          trajectoryTotal={trajetos.length}
          onClose={() => setActive(null)}
          onSave={save}
        />
      ) : null}
    </>
  );
}

function ResearchCard({
  research,
  initials,
  preferred,
  onTogglePreferred,
}: {
  research: FareResearch;
  initials: string;
  preferred: boolean;
  onTogglePreferred: () => void;
}) {
  const first = research.segments[0];
  const route =
    research.transferKind === "plane" && first.originCode && first.destinationCode
      ? `${first.originCode} → ${first.destinationCode}`
      : `${first.from} → ${first.to}`;
  const money = formatResearchMoney(research);
  const points = formatResearchPoints(research);
  const price = money ?? points ?? "Sem valor";
  const type =
    research.transferKind === "other"
      ? research.otherTransfer || "Outro"
      : transferLabel({ kind: research.transferKind });
  const detail = research.provider ? `${route} · ${research.provider}` : route;

  return (
    <article className={`${styles.researchCard} ${preferred ? styles.researchPreferred : ""}`}>
      <div className={styles.researchMain}>
        <span className={styles.researchAvatar}>{initials.slice(0, 2).toUpperCase()}</span>
        <div>
          <div className={styles.researchIdentity}>
            <strong>Você</strong>
            <span>{type}</span>
          </div>
          <small>{detail}</small>
        </div>
      </div>
      <div className={styles.researchPrice}>
        <strong>{price}</strong>
        <small>{research.priceBasis === "person" ? "por pessoa" : "por veículo"}</small>
        {money && points ? <small>{points}</small> : null}
      </div>
      <button type="button" className={styles.preferredButton} onClick={onTogglePreferred}>
        {preferred ? "★ Preferida de você" : "Marcar preferida"}
      </button>
    </article>
  );
}

function scopeLabel(trajeto: Trajeto): string {
  if (trajeto.kind === "ida") return "Sua ida · pessoal";
  return "Compartilhado";
}

function countLabel(count: number, preferredCount: number): string {
  if (count === 0) return "Sem pesquisas ainda";
  const research = count === 1 ? "1 pesquisa" : `${count} pesquisas`;
  const preferred = preferredCount === 1 ? "1 preferida" : "nenhuma preferida";
  return `${research} · ${preferred}`;
}

function createResearchId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `research-${Date.now()}`;
}
