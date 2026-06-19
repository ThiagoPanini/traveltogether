import Link from "next/link";

import type {
  ActivePanel,
  PanelLegMode,
  PanelMember,
  RadarRow,
} from "@/lib/dashboard/active-panel";
import { initials } from "@/lib/identity/user-display";

// Painel apresentacional Espresso (rodada 0). Recebe o `ActivePanel` já
// derivado (buildActivePanel) e NADA mais — sem fetch, sem sessão, sem hooks.
// Render determinístico, testável com dados estáticos. Ver ADR-0020.

function ModeIcon({ mode, size = 15 }: { mode: PanelLegMode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {mode === "air" ? (
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
      ) : (
        <>
          <circle cx="6.5" cy="17" r="1.8" />
          <circle cx="17.5" cy="17" r="1.8" />
          <path d="M4 13l1.6-5h9l3 4v5h-1.7M8.3 17h7.4M4 13h12" />
        </>
      )}
    </svg>
  );
}

const MODE_LABEL: Record<PanelLegMode, string> = { air: "Aéreo", ground: "Terrestre" };

function Avatar({ member, idx }: { member: PanelMember; idx: number }) {
  return (
    <span className="panel-av" style={{ marginLeft: idx === 0 ? 0 : -8 }}>
      {member.avatarUrl ? (
        // biome-ignore lint/performance/noImgElement: avatar externo simples; sem otimização de imagem no casco
        <img src={member.avatarUrl} alt={member.label} />
      ) : (
        initials(member.label)
      )}
    </span>
  );
}

function RadarLine({ row }: { row: RadarRow }) {
  return (
    <div className="radar-row">
      <span className="radar-leg">{row.fromTo}</span>
      <span className="radar-mode">
        <ModeIcon mode={row.mode} />
        {MODE_LABEL[row.mode]}
      </span>
      <span className="radar-status">cotação em breve</span>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="panel-empty">
      <span className="kicker">Ponto de partida</span>
      <h1>O mapa ainda está em branco.</h1>
      <p>
        Toda viagem começa com um nome. Cadastre a primeira, monte a rota com o grupo e registrem
        juntos as pesquisas de passagem — cada preço encontrado fica guardado para comparar.
      </p>
      <div className="card panel-empty-card">
        <Link className="btn ink" href="/trips/new">
          + Criar a primeira viagem
        </Link>
        <p className="panel-empty-foot">Leva 1 minuto — e dá pra ajustar tudo depois.</p>
      </div>
    </div>
  );
}

export function PanelView({ panel }: { panel: ActivePanel }) {
  if (panel.isEmpty || !panel.hero) {
    return <EmptyPanel />;
  }
  const { hero } = panel;
  const memberCount = hero.members.length;

  return (
    <div className="panel">
      <div className="card panel-hero">
        <span className="kicker panel-hero-kicker">Próxima viagem</span>
        <h2 className="panel-hero-name">{hero.name}</h2>
        <div className="panel-hero-meta">
          {hero.periodLabel && <span className="panel-period">{hero.periodLabel}</span>}
          {memberCount > 0 && (
            <span className="panel-members">
              <span className="panel-avs">
                {hero.members.map((m, i) => (
                  <Avatar key={m.seed} member={m} idx={i} />
                ))}
              </span>
              {memberCount} {memberCount === 1 ? "viajante" : "viajantes"}
            </span>
          )}
        </div>
        {hero.ribbon.length > 0 && (
          <div className="panel-ribbon">
            {hero.ribbon.map((item) =>
              item.kind === "city" ? (
                <span key={item.key} className="ribbon-city">
                  {item.label}
                </span>
              ) : (
                <span key={item.key} className="ribbon-hop" title={MODE_LABEL[item.mode]}>
                  <ModeIcon mode={item.mode} size={16} />
                </span>
              ),
            )}
          </div>
        )}
      </div>

      <div className="panel-radar-head">
        <h3>Radar de preço</h3>
        <span className="kicker">trajetos no radar</span>
      </div>
      <div className="card panel-radar">
        {hero.radar.length > 0 ? (
          hero.radar.map((row) => <RadarLine key={row.key} row={row} />)
        ) : (
          <div className="radar-row">
            <span className="radar-status">Adicione paradas para montar a rota.</span>
          </div>
        )}
      </div>

      {panel.others.length > 0 && (
        <div className="panel-others">
          <span className="kicker">outras viagens</span>
          {panel.others.map((o) => (
            <span key={o.id} className="other-trip">
              {o.name} <span className="other-tag">{o.tag}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
