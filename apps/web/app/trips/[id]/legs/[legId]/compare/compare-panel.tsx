"use client";

import type { MembershipRole } from "@traveltogether/types";
import { useState } from "react";
import type { FareRow, SortKey } from "@/lib/compare-fares";
import { sortFares } from "@/lib/compare-fares";

interface Props {
  legId: string;
  initialRows: FareRow[];
  role: MembershipRole;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase();
}

export default function ComparePanel({ initialRows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const rows = sortFares(initialRows, sortKey);

  if (rows.length === 0) {
    return <p className="trips-empty">Nenhuma pesquisa registrada para este trajeto.</p>;
  }

  return (
    <div className="compare-panel">
      <div className="compare-sort-bar">
        <span className="compare-sort-label">Ordenar por</span>
        <button
          type="button"
          onClick={() => setSortKey("price")}
          className={sortKey === "price" ? "sort-btn active" : "sort-btn"}
        >
          Preço
        </button>
        <button
          type="button"
          onClick={() => setSortKey("upvotes")}
          className={sortKey === "upvotes" ? "sort-btn active" : "sort-btn"}
        >
          Upvotes
        </button>
      </div>

      <ul className="ticket-list">
        {rows.map((row) => (
          <li key={row.id} className={row.is_chosen ? "ticket-row ticket-chosen" : "ticket-row"}>
            {row.is_chosen && <span className="ticket-chosen-badge">★ Escolhida</span>}

            <div className="ticket-route">
              <span className="ticket-code">{row.origin_airport}</span>
              <span className="ticket-arrow">→</span>
              <span className="ticket-code">{row.destination_airport}</span>
            </div>

            <div className="ticket-meta">
              <span className="ticket-airline">{row.airline}</span>
              <span className="ticket-date">{formatDate(row.flight_date)}</span>
            </div>

            <div className="ticket-details">
              <span className="ticket-detail">{formatDuration(row.duration_minutes)}</span>
              <span className="ticket-detail">
                {row.stops === 0 ? "Direto" : `${row.stops} escala${row.stops > 1 ? "s" : ""}`}
              </span>
              {row.checked_baggage && <span className="ticket-detail">Bagagem</span>}
            </div>

            <div className="ticket-right">
              <span className="ticket-price">
                <span className="ticket-currency">{row.currency}</span>
                <span className="ticket-amount">{row.value}</span>
              </span>
              <span className="ticket-upvotes">↑ {row.upvote_count}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
