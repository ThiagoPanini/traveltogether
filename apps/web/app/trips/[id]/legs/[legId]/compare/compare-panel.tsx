"use client";

import type { MembershipRole } from "@traveltogether/types";
import { useState } from "react";

import { Code, Icon } from "@/components/atlas";
import type { FareRow, SortKey } from "@/lib/compare-fares";
import { sortFares } from "@/lib/compare-fares";
import { formatDate, formatDuration } from "@/lib/fares/format";

interface Props {
  legId: string;
  initialRows: FareRow[];
  role: MembershipRole;
}

export default function ComparePanel({ initialRows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const rows = sortFares(initialRows, sortKey);

  if (rows.length === 0) {
    return (
      <div className="empty">
        <Icon name="plane" size={22} />
        <div style={{ fontWeight: 600, color: "var(--ink-soft)" }}>
          Nenhuma pesquisa registrada para este trajeto.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <span className="kicker">comparação</span>
        <span className="spacer" />
        <span className="mono" style={{ fontSize: 10, color: "var(--muted)", marginRight: 6 }}>
          ordenar por
        </span>
        <button
          className={`btn tiny ${sortKey === "price" ? "accent" : "ghost"}`}
          onClick={() => setSortKey("price")}
          type="button"
        >
          Preço
        </button>
        <button
          className={`btn tiny ${sortKey === "upvotes" ? "accent" : "ghost"}`}
          onClick={() => setSortKey("upvotes")}
          type="button"
        >
          Upvotes
        </button>
      </div>

      <div className="card">
        <div className="board">
          {rows.map((row) => (
            <div
              key={row.id}
              className="board-row"
              style={{
                gridTemplateColumns: "auto 1fr auto auto",
                background: row.is_chosen
                  ? "color-mix(in oklab, var(--accent) 7%, transparent)"
                  : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Code code={row.origin_airport} size="sm" />
                <span style={{ color: "var(--muted)" }}>→</span>
                <Code code={row.destination_airport} size="sm" />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 650,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {row.airline}
                  {row.is_chosen && <span className="stamp">escolhida</span>}
                </div>
                <div
                  className="mono-num"
                  style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}
                >
                  {formatDate(row.flight_date)} · {formatDuration(row.duration_minutes)} ·{" "}
                  {row.stops === 0 ? "direto" : `${row.stops} escala${row.stops > 1 ? "s" : ""}`}
                  {row.checked_baggage ? " · c/ bagagem" : ""}
                </div>
              </div>
              <div
                className="mono-num"
                style={{ fontWeight: 700, fontSize: 18, whiteSpace: "nowrap" }}
              >
                {row.currency} {row.value}
              </div>
              <span className="upvote">
                <Icon name="up" size={12} /> {row.upvote_count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
        valores na moeda de cada pesquisa · sem conversão de câmbio — comparação visual
      </p>
    </div>
  );
}
