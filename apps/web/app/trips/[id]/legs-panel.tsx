"use client";

import type { LegPublic, MembershipRole, StopPublic } from "@traveltogether/types";
import Link from "next/link";
import { useState } from "react";

import { createLegAction, deleteLegAction } from "./actions";

interface Props {
  tripId: string;
  origin: string;
  initialLegs: LegPublic[];
  stops: StopPublic[];
  role: MembershipRole;
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

export default function LegsPanel({ tripId, origin, initialLegs, stops, role, fareCounts }: Props) {
  const [legs, setLegs] = useState<LegPublic[]>(initialLegs);
  const [originId, setOriginId] = useState<string>("");
  const [destId, setDestId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const isOrganizer = role === "organizer";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const leg = await createLegAction(tripId, {
      origin_stop_id: originId === "" ? null : originId,
      destination_stop_id: destId === "" ? null : destId,
    });
    if (leg) {
      setLegs((prev) => [...prev, leg]);
      setOriginId("");
      setDestId("");
    }
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(legId: string) {
    setLoading(true);
    await deleteLegAction(tripId, legId);
    setLegs((prev) => prev.filter((l) => l.id !== legId));
    setLoading(false);
    router.refresh();
  }

  const stopOptions = [
    { id: "", label: origin },
    ...stops.map((s) => ({ id: s.id, label: s.city })),
  ];

  return (
    <div className="legs-panel">
      {legs.length === 0 ? (
        <p className="trips-empty">Nenhum trajeto adicionado.</p>
      ) : (
        <ol className="legs-list">
          {legs.map((leg) => {
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
                {isOrganizer && (
                  <button
                    type="button"
                    onClick={() => handleDelete(leg.id)}
                    disabled={loading}
                    className="danger-button btn-sm"
                  >
                    Remover
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {isOrganizer && (
        <form onSubmit={handleAdd} className="leg-add-form">
          <select
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            className="leg-select"
          >
            {stopOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <span>→</span>
          <select value={destId} onChange={(e) => setDestId(e.target.value)} className="leg-select">
            {stopOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="submit" disabled={loading} className="primary-button">
            Adicionar Trajeto
          </button>
        </form>
      )}
    </div>
  );
}
