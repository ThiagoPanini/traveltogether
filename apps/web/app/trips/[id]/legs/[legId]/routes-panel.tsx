"use client";

import type { RouteWithSegments, SegmentMode, SegmentPublic } from "@traveltogether/types";
import { useState } from "react";

import { Icon } from "@/components/atlas";
import {
  addSegmentAction,
  createRouteAction,
  deleteRouteAction,
  deleteSegmentAction,
  reorderSegmentsAction,
} from "./actions";

interface Props {
  tripId: string;
  legId: string;
  initialRoutes: RouteWithSegments[];
}

function segmentLabel(s: SegmentPublic): string {
  const from = s.origin_airport ?? "—";
  const to = s.destination_airport ?? "—";
  return `${from} → ${to}`;
}

export default function RoutesPanel({ tripId, legId, initialRoutes }: Props) {
  const [routes, setRoutes] = useState<RouteWithSegments[]>(initialRoutes);
  const [newLabel, setNewLabel] = useState("");
  const [loading, setLoading] = useState(false);

  function replaceSegments(routeId: string, segments: SegmentPublic[]) {
    setRoutes((rs) => rs.map((r) => (r.id === routeId ? { ...r, segments } : r)));
  }

  async function handleCreateRoute() {
    if (loading) return;
    setLoading(true);
    const created = await createRouteAction(tripId, legId, { label: newLabel.trim() });
    if (created) {
      setRoutes((rs) => [...rs, created]);
      setNewLabel("");
    }
    setLoading(false);
  }

  async function handleDeleteRoute(routeId: string) {
    if (loading) return;
    setLoading(true);
    const ok = await deleteRouteAction(tripId, legId, routeId);
    if (ok) setRoutes((rs) => rs.filter((r) => r.id !== routeId));
    setLoading(false);
  }

  async function handleAddSegment(
    routeId: string,
    origin: string,
    dest: string,
    mode: SegmentMode,
  ) {
    if (loading) return;
    setLoading(true);
    const seg = await addSegmentAction(tripId, legId, routeId, {
      origin_airport: origin.trim() || null,
      destination_airport: dest.trim() || null,
      mode,
    });
    if (seg) {
      setRoutes((rs) =>
        rs.map((r) => (r.id === routeId ? { ...r, segments: [...r.segments, seg] } : r)),
      );
    }
    setLoading(false);
  }

  async function handleDeleteSegment(routeId: string, segmentId: string) {
    if (loading) return;
    setLoading(true);
    const ok = await deleteSegmentAction(tripId, legId, routeId, segmentId);
    if (ok) {
      setRoutes((rs) =>
        rs.map((r) =>
          r.id === routeId ? { ...r, segments: r.segments.filter((s) => s.id !== segmentId) } : r,
        ),
      );
    }
    setLoading(false);
  }

  async function handleMove(routeId: string, index: number, delta: number) {
    if (loading) return;
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;
    const target = index + delta;
    if (target < 0 || target >= route.segments.length) return;
    const ids = route.segments.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setLoading(true);
    const reordered = await reorderSegmentsAction(tripId, legId, routeId, ids);
    if (reordered) replaceSegments(routeId, reordered);
    setLoading(false);
  }

  return (
    <section className="card" aria-label="Rotas do trajeto">
      <div className="section-head">
        <span className="kicker">Rotas</span>
      </div>
      <p className="empty" style={{ marginTop: 0 }}>
        Cada Rota é um caminho candidato (ex.: direto ou via Miami), formado por Trechos ordenados.
      </p>

      {routes.map((route) => (
        <article key={route.id} className="card flat" style={{ marginBottom: 12 }}>
          <div className="board-row">
            <strong className="row-label">{route.label || "Rota sem nome"}</strong>
            <button
              type="button"
              className="btn tiny ghost"
              disabled={loading}
              onClick={() => handleDeleteRoute(route.id)}
            >
              <Icon name="trash" /> Remover Rota
            </button>
          </div>

          {route.segments.length === 0 ? (
            <p className="empty">Sem Trechos ainda.</p>
          ) : (
            <ol className="board">
              {route.segments.map((seg, index) => (
                <li key={seg.id} className={`board-row segment-${seg.mode}`} data-mode={seg.mode}>
                  <span className="mono">{segmentLabel(seg)}</span>
                  <span className="chip outline">{seg.mode === "air" ? "aéreo" : "terrestre"}</span>
                  <span className="spacer" />
                  <button
                    type="button"
                    className="btn tiny ghost"
                    disabled={loading || index === 0}
                    onClick={() => handleMove(route.id, index, -1)}
                    aria-label="Subir Trecho"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn tiny ghost"
                    disabled={loading || index === route.segments.length - 1}
                    onClick={() => handleMove(route.id, index, 1)}
                    aria-label="Descer Trecho"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn tiny ghost"
                    disabled={loading}
                    onClick={() => handleDeleteSegment(route.id, seg.id)}
                    aria-label="Remover Trecho"
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ol>
          )}

          <AddSegmentForm
            disabled={loading}
            onAdd={(origin, dest, mode) => handleAddSegment(route.id, origin, dest, mode)}
          />
        </article>
      ))}

      <div className="form-row cols-2">
        <input
          className="field"
          placeholder="Nome da nova Rota (ex.: via Miami)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <button
          type="button"
          className="btn small accent"
          disabled={loading}
          onClick={handleCreateRoute}
        >
          <Icon name="plus" /> Adicionar Rota
        </button>
      </div>
    </section>
  );
}

function AddSegmentForm({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (origin: string, dest: string, mode: SegmentMode) => void;
}) {
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [mode, setMode] = useState<SegmentMode>("air");

  return (
    <div className="form-row cols-4">
      <input
        className="field"
        placeholder="Origem (IATA)"
        value={origin}
        onChange={(e) => setOrigin(e.target.value.toUpperCase())}
        maxLength={3}
      />
      <input
        className="field"
        placeholder="Destino (IATA)"
        value={dest}
        onChange={(e) => setDest(e.target.value.toUpperCase())}
        maxLength={3}
      />
      <select
        className="field"
        value={mode}
        onChange={(e) => setMode(e.target.value as SegmentMode)}
        aria-label="Modo do Trecho"
      >
        <option value="air">aéreo</option>
        <option value="ground">terrestre</option>
      </select>
      <button
        type="button"
        className="btn small ghost"
        disabled={disabled}
        onClick={() => {
          onAdd(origin, dest, mode);
          setOrigin("");
          setDest("");
          setMode("air");
        }}
      >
        <Icon name="plus" /> Adicionar Trecho
      </button>
    </div>
  );
}
