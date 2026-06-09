"use client";

import type { LegPublic, MembershipRole, StopPublic } from "@traveltogether/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createLeg, deleteLeg } from "@/lib/api/trips";

interface Props {
  tripId: string;
  origin: string;
  initialLegs: LegPublic[];
  stops: StopPublic[];
  role: MembershipRole;
  accessToken: string;
}

function stopLabel(stopId: string | null, stops: StopPublic[], origin: string): string {
  if (stopId === null) return origin;
  return stops.find((s) => s.id === stopId)?.city ?? stopId;
}

export default function LegsPanel({
  tripId,
  origin,
  initialLegs,
  stops,
  role,
  accessToken,
}: Props) {
  const router = useRouter();
  const [legs, setLegs] = useState<LegPublic[]>(initialLegs);
  const [originId, setOriginId] = useState<string>("");
  const [destId, setDestId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const isOrganizer = role === "organizer";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const leg = await createLeg(accessToken, tripId, {
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
    await deleteLeg(accessToken, tripId, legId);
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
          {legs.map((leg) => (
            <li key={leg.id} className="leg-item">
              <span className="leg-route">
                <span className="leg-origin">{stopLabel(leg.origin_stop_id, stops, origin)}</span>
                <span className="leg-arrow"> → </span>
                <span className="leg-dest">
                  {stopLabel(leg.destination_stop_id, stops, origin)}
                </span>
              </span>
              {isOrganizer && (
                <button
                  type="button"
                  onClick={() => handleDelete(leg.id)}
                  disabled={loading}
                  className="danger-button"
                >
                  Remover
                </button>
              )}
            </li>
          ))}
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
