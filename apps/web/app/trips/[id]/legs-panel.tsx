import type { LegPublic, StopPublic } from "@traveltogether/types";
import Link from "next/link";

interface Props {
  tripId: string;
  origin: string;
  initialLegs: LegPublic[];
  stops: StopPublic[];
  fareCounts: Record<string, number>;
}

function stopLabel(stopId: string | null, stops: StopPublic[], origin: string): string {
  if (stopId === null) return origin;
  return stops.find((s) => s.id === stopId)?.city ?? stopId;
}

function displayCode(value: string): string {
  const match = value.match(/\(([A-Za-z]{3})\)/);
  if (match) return match[1].toUpperCase();
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const letters = normalized.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "LEG").padEnd(3, "X");
}

export default function LegsPanel({ tripId, origin, initialLegs, stops, fareCounts }: Props) {
  return (
    <div className="legs-panel">
      {initialLegs.length === 0 ? (
        <p className="trips-empty">Nenhum trajeto derivado.</p>
      ) : (
        <ol className="legs-list">
          {initialLegs.map((leg) => {
            const originLabel = stopLabel(leg.origin_stop_id, stops, origin);
            const destLabel = stopLabel(leg.destination_stop_id, stops, origin);
            const count = fareCounts[leg.id] ?? 0;
            return (
              <li key={leg.id} className="leg-item">
                <Link href={`/trips/${tripId}/legs/${leg.id}`} className="leg-item-link">
                  <span className="ticket-ic" aria-hidden="true">
                    🎫
                  </span>
                  <span className="leg-main">
                    <span className="leg-route">
                      {displayCode(originLabel)}
                      <span className="leg-arrow">→</span>
                      {displayCode(destLabel)}
                    </span>
                    <span className="leg-cities">
                      {originLabel} → {destLabel}
                    </span>
                  </span>
                  <span className="leg-spacer" />
                  {count === 0 ? (
                    <span className="lr-empty">sem passagens →</span>
                  ) : (
                    <span className="lr-count">
                      {count} {count === 1 ? "pesquisa" : "pesquisas"} →
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
