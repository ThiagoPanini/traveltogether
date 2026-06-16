import Link from "next/link";

import type { PanelData } from "@/lib/dashboard/panel-data";
import {
  AlertCard,
  AvatarStack,
  Countdown,
  CoverGraphic,
  Icon,
  MiniRoute,
  Progress,
  StatusPill,
  UserAvatar,
} from "./atlas";

// Painel apresentacional. Recebe `PanelData` já derivado (buildPanelData) e
// NADA mais — sem fetch, sem sessão, sem hooks. Renderiza determinístico a
// partir das props (testável com dados estáticos).
//
// `readOnly` desliga TODA navegação: nenhum `Link` é emitido (vira marcação
// estática). É o modo do Painel de exemplo (DemoOverlay #137), que pinta sobre
// dados fixos sem rotas reais. Com `readOnly={false}` (Painel real #111) as
// superfícies viram links para suas telas.
export function PanelView({ data, readOnly = false }: { data: PanelData; readOnly?: boolean }) {
  const { hero, alerts, activity, tasks, notifications, budget } = data;

  return (
    <div className="page fadeup">
      <div className="shell">
        <div className="page-head">
          <div>
            <div
              className="mono"
              style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}
            >
              painel de controle
            </div>
            <h1 className="display">{data.greeting}</h1>
          </div>
          <span className="spacer" />
          <div style={{ textAlign: "right" }}>
            {data.todayLabel && (
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                {data.todayLabel}
              </div>
            )}
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{data.waitingLabel}</div>
          </div>
        </div>

        {hero && (
          <div className="panel" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
            <div className="hero-grid">
              <div style={{ position: "relative" }}>
                <CoverGraphic codeLabel={hero.coverCode} height="100%" seedText={hero.coverSeed} />
                <div style={{ position: "absolute", left: 16, top: 14 }}>
                  <span
                    className="mono"
                    style={{ fontSize: 9.5, color: "#fff", opacity: 0.85, letterSpacing: "0.16em" }}
                  >
                    próxima viagem
                  </span>
                </div>
              </div>
              <div
                style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}
                >
                  <div style={{ flex: "1 1 240px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}
                    >
                      <StatusPill status={hero.status} />
                      <AvatarStack members={hero.members} />
                    </div>
                    <h2 className="display" style={{ fontSize: 28 }}>
                      {hero.name}
                    </h2>
                    <div
                      className="mono"
                      style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}
                    >
                      {hero.rangeLabel}
                      {hero.nights !== null ? ` · ${hero.nights} noites` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      alignItems: "flex-end",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 9.5, color: "var(--muted)" }}>
                      embarque em
                    </span>
                    <Countdown value={hero.countdown} />
                  </div>
                </div>

                <div style={{ paddingTop: 4 }}>
                  <MiniRoute codes={hero.routeCodes} />
                </div>
                <Progress total={hero.legsTotal} value={hero.legsChosen} />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    flexWrap: "wrap",
                    marginTop: "auto",
                    paddingTop: 8,
                  }}
                >
                  <Metric
                    value={`${hero.legsChosen}/${hero.legsTotal}`}
                    label="trajetos decididos"
                  />
                  <Metric value={String(hero.openTasks)} label="tarefas abertas" />
                  <Metric value={hero.perPersonLabel} label="estimado / pessoa" />
                  <span className="spacer" style={{ flex: 1 }} />
                  {readOnly ? (
                    <span className="btn accent small">
                      Abrir viagem <Icon name="arrowRight" size={13} />
                    </span>
                  ) : (
                    <Link className="btn accent small" href={hero.href}>
                      Abrir viagem <Icon name="arrowRight" size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid-2">
          {/* coluna principal */}
          <div className="stack">
            {/* o que precisa de mim */}
            <div className="panel">
              <div className="panel-head">
                <span className="kicker">o que precisa de mim</span>
                <span className="spacer" />
                {alerts.length > 0 && <span className="chip accent">{alerts.length}</span>}
              </div>
              {alerts.length ? (
                <div className="stack" style={{ gap: 10 }}>
                  {alerts.map((a) => (
                    <AlertCard
                      href={readOnly ? undefined : a.href}
                      icon={a.icon}
                      key={a.href}
                      sub={a.sub}
                      title={a.title}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 2px",
                    color: "var(--muted)",
                  }}
                >
                  <span style={{ color: "var(--ok)" }}>
                    <Icon name="check" size={18} />
                  </span>
                  <span style={{ fontSize: 13.5 }}>
                    Nenhuma decisão pendente para você agora. Aproveite.
                  </span>
                </div>
              )}
            </div>

            {/* atividade recente */}
            <div className="panel">
              <div className="panel-head">
                <span className="kicker">atividade recente</span>
                <span className="spacer" />
                <SectionLink href="/activity" readOnly={readOnly}>
                  ver tudo
                </SectionLink>
              </div>
              {activity.length ? (
                <div>
                  {activity.map((e) => (
                    <div className="row" key={e.id}>
                      {e.actorName && (
                        <UserAvatar label={e.actorName} seed={e.actorName} size={28} />
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13.5, textWrap: "pretty" }}>
                          {e.actorName && (
                            <strong style={{ fontWeight: 600 }}>{e.actorName} </strong>
                          )}
                          {e.body}
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--muted)" }}>
                          {e.tripName}
                        </span>
                      </div>
                      <span className="chip outline" style={{ fontSize: 9.5 }}>
                        {e.kindLabel}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="soft" style={{ fontSize: 13, padding: "4px 0" }}>
                  Nada por aqui ainda.
                </p>
              )}
            </div>
          </div>

          {/* coluna lateral */}
          <div className="stack">
            {/* minhas tarefas */}
            <div className="panel">
              <div className="panel-head">
                <span className="kicker">minhas tarefas</span>
                <span className="spacer" />
                <SectionLink href="/tasks" readOnly={readOnly}>
                  todas
                </SectionLink>
              </div>
              {tasks.length ? (
                <div>
                  {tasks.map((t) => (
                    <TaskRow key={t.id} readOnly={readOnly} task={t} />
                  ))}
                </div>
              ) : (
                <p className="soft" style={{ fontSize: 13, padding: "4px 0" }}>
                  Sem tarefas atribuídas a você.
                </p>
              )}
            </div>

            {/* avisos */}
            <div className="panel">
              <div className="panel-head">
                <span className="kicker">avisos</span>
                <span className="spacer" />
                {data.unreadCount > 0 && <span className="chip accent">{data.unreadCount}</span>}
              </div>
              {notifications.length ? (
                <div className="stack" style={{ gap: 12 }}>
                  {notifications.map((n) => (
                    <NotifRow key={n.id} notif={n} readOnly={readOnly} />
                  ))}
                </div>
              ) : (
                <p className="soft" style={{ fontSize: 13, padding: "4px 0" }}>
                  Nada novo por enquanto.
                </p>
              )}
            </div>

            {/* snapshot de orçamento (por moeda — sem conversão, Invariante 15) */}
            {budget && (
              <div className="panel">
                <div className="panel-head">
                  <span className="kicker">orçamento · {budget.tripName}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {budget.rows.map((r) => (
                    <div
                      key={r.currency}
                      style={{ display: "flex", alignItems: "baseline", gap: 10 }}
                    >
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "var(--muted)", width: 42 }}
                      >
                        {r.currency}
                      </span>
                      <span
                        className="mono"
                        style={{ fontSize: 10.5, color: "var(--muted)", flex: 1 }}
                      >
                        {r.perGroup} no grupo
                      </span>
                      <span className="mono-num" style={{ fontSize: 14, fontWeight: 700 }}>
                        {r.perPerson}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 12 }}>
                  por pessoa · sem conversão de câmbio
                </p>
                {readOnly ? (
                  <span
                    className="btn ghost small"
                    style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
                  >
                    <Icon name="wallet" size={13} /> Ver orçamento completo
                  </span>
                ) : (
                  <Link
                    className="btn ghost small"
                    href={budget.href}
                    style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
                  >
                    <Icon name="wallet" size={13} /> Ver orçamento completo
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric" style={{ gap: 2 }}>
      <span className="mono-num" style={{ fontWeight: 700, fontSize: 15 }}>
        {value}
      </span>
      <span className="l" style={{ fontSize: 11 }}>
        {label}
      </span>
    </div>
  );
}

// Link de seção ("ver tudo" / "todas"): vira texto inerte no modo read-only.
function SectionLink({
  href,
  readOnly,
  children,
}: {
  href: string;
  readOnly: boolean;
  children: string;
}) {
  if (readOnly) {
    return (
      <span className="link-btn" style={{ fontSize: 12.5 }}>
        {children}
      </span>
    );
  }
  return (
    <Link className="link-btn" href={href} style={{ fontSize: 12.5 }}>
      {children}
    </Link>
  );
}

function TaskRow({ task, readOnly }: { task: PanelData["tasks"][number]; readOnly: boolean }) {
  const inner = (
    <>
      <span className="checkbox">
        <Icon name="check" size={12} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{task.title}</div>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--muted)" }}>
          {task.tripName}
        </span>
      </div>
      <span className="chip outline" style={{ fontSize: 10 }}>
        {task.statusLabel}
      </span>
    </>
  );
  if (readOnly) {
    return <div className="row">{inner}</div>;
  }
  return (
    <Link className="row" href={task.href} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  );
}

function NotifRow({
  notif,
  readOnly,
}: {
  notif: PanelData["notifications"][number];
  readOnly: boolean;
}) {
  const inner = (
    <>
      <span style={{ color: "var(--accent)", flex: "none", marginTop: 1 }}>
        <Icon name={notif.icon} size={16} />
      </span>
      <span style={{ fontSize: 12.5, color: "var(--ink-soft)", textWrap: "pretty", flex: 1 }}>
        {notif.text}
      </span>
    </>
  );
  if (readOnly) {
    return (
      <div className="row" style={{ borderTop: "1px solid var(--line-soft)" }}>
        {inner}
      </div>
    );
  }
  return (
    <Link
      className="row"
      href={notif.href}
      style={{ borderTop: "1px solid var(--line-soft)", textDecoration: "none", color: "inherit" }}
    >
      {inner}
    </Link>
  );
}
