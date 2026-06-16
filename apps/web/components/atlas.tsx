import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import type { CountdownValue } from "@/lib/dashboard/panel-data";
import { topographicAvatar } from "@/lib/identity/avatar";
import { initials } from "@/lib/identity/user-display";
import { TRIP_STATUS_LABEL, type TripStatus } from "@/lib/trips/card";

// ---------- Icon ----------
const ICON_PATHS: Record<string, ReactNode> = {
  plane: (
    <path
      d="M10.5 1.5 9 3v3.5L2.5 10v1.5l6.5-1.8v3.5l-1.8 1.3v1l2.8-.8 2.8.8v-1L11 13.2V9.7l6.5 1.8V10L11 6.5V3l-1.5-1.5z"
      transform="scale(0.85) translate(1.5,0)"
    />
  ),
  arrowRight: (
    <path
      d="M3 8h9M9 4.5 12.5 8 9 11.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  arrowLeft: (
    <path
      d="M13 8H4M7 4.5 3.5 8 7 11.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  refresh: (
    <path
      d="M13 8a5 5 0 1 1-1.5-3.5M13 2.5V5h-2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  alert: (
    <path
      d="M8 2 14.5 13.5H1.5L8 2zM8 6.3v3.4M8 11.7v.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  plus: (
    <path
      d="M8 3v10M3 8h10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ),
  pin: (
    <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5A4.5 4.5 0 0 0 8 1.5zm0 6.2a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6z" />
  ),
  calendar: (
    <path
      d="M3 3.5h10a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1zM2 6.5h12M5.5 2v2.5M10.5 2v2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  ),
  users: (
    <path
      d="M6 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-4.5 6c0-2.2 2-4 4.5-4s4.5 1.8 4.5 4M11 7.8a2.2 2.2 0 1 0-1.5-4M11.5 10.3c1.8.4 3 1.8 3 3.7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  ),
  up: (
    <path
      d="M8 13V3M4 7l4-4 4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  check: (
    <path
      d="M2.5 8.5 6 12l7.5-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  clock: (
    <path
      d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 4.5V8l2.5 1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  edit: (
    <path
      d="M11.5 2.5 13.5 4.5 6 12l-3 1 1-3 7.5-7.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
  trash: (
    <path
      d="M3 4.5h10M6.5 4.5v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M5 4.5 5.6 13a1 1 0 0 0 1 .9h2.8a1 1 0 0 0 1-.9l.6-8.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  ),
  compass: (
    <path
      d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM10.5 5.5 9 9l-3.5 1.5L7 7l3.5-1.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
  grip: (
    <path d="M6 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM6 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM6 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
  ),
  message: (
    <path
      d="M2.5 3.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6l-3 2.5V11.5h-.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
  grid: (
    <path
      d="M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
  checkSquare: (
    <path
      d="M3 3.5h10a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5zM5.5 8l2 2 3.5-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  bell: (
    <path
      d="M8 2a4 4 0 0 0-4 4c0 3-1.2 4.5-1.5 5h11c-.3-.5-1.5-2-1.5-5a4 4 0 0 0-4-4zM6.5 13a1.5 1.5 0 0 0 3 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  activity: (
    <path
      d="M1.5 8h3l1.5-4 2.5 8 1.5-4h4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  user: (
    <path
      d="M8 8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 14c0-2.6 2.4-4.5 5.5-4.5s5.5 1.9 5.5 4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  chevronRight: (
    <path
      d="M6 3.5 10.5 8 6 12.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  wallet: (
    <path
      d="M2.5 4.5h11v8h-11v-8zM2.5 6.5h11M11 9.5h1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  chat: (
    <path
      d="M2.5 3.5h11v7h-7l-3 2.5v-2.5h-1v-7z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  route: (
    <path
      d="M4 13h5.5a2.5 2.5 0 0 0 0-5h-3a2.5 2.5 0 0 1 0-5H12M4 13a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0zm10-10a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  eye: (
    <path
      d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
};

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, size = 16 }: { name: keyof typeof ICON_PATHS; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      {ICON_PATHS[name] ?? null}
    </svg>
  );
}

// ---------- airport code (split-flap) ----------
export function Code({ code, size = "md" }: { code: string; size?: "lg" | "md" | "sm" }) {
  return (
    <span className={`code ${size}`}>
      {code.split("").map((char, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 3-char airport code
        <span key={i}>{char}</span>
      ))}
    </span>
  );
}

// ---------- topographic cover ----------
function topoPaths(seed: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    const y = 8 + i * 16 + ((seed * 7) % 11);
    out.push(
      `M -10 ${y} C 40 ${y - 18 - ((i * seed) % 9)}, 90 ${y + 14}, 140 ${y - 8} S 230 ${y + 10}, 260 ${y - 4}`,
    );
  }
  return out;
}

export function Topo({ seed = 1 }: { seed?: number }) {
  const lines = topoPaths(seed);
  return (
    <svg
      aria-hidden="true"
      className="topo"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 250 100"
    >
      {lines.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
          opacity={0.55 - i * 0.06}
        />
      ))}
    </svg>
  );
}

function seedFrom(value: string): number {
  return ([...value].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 9) + 1;
}

export function CoverGraphic({
  seedText,
  codeLabel,
  height = 120,
}: {
  seedText: string;
  codeLabel: string;
  height?: number | string;
}) {
  return (
    <div className="cover" style={{ height }}>
      <Topo seed={seedFrom(seedText)} />
      <div className="cover-band" />
      <div className="cover-code" style={{ fontSize: 12 }}>
        {codeLabel}
      </div>
    </div>
  );
}

// ---------- route line ----------
export interface RoutePoint {
  code: string;
  city: string;
  dates?: string;
  muted?: boolean;
}
export interface RouteEdge {
  href?: string;
  meta: string;
  price?: string;
}

export function RouteLine({ points, edges }: { points: RoutePoint[]; edges: RouteEdge[] }) {
  return (
    <div className="routeline">
      {points.map((point, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: route node positions are stable
        <span key={i} style={{ display: "contents" }}>
          {i > 0 &&
            (() => {
              const edge = edges[i - 1];
              const inner = (
                <>
                  <span className="line" />
                  <span className="edge-meta">{edge.meta}</span>
                  {edge.price && <span className="edge-price">{edge.price}</span>}
                </>
              );
              return edge.href ? (
                <Link className="route-edge" href={edge.href}>
                  {inner}
                </Link>
              ) : (
                <span className="route-edge" style={{ cursor: "default" }}>
                  {inner}
                </span>
              );
            })()}
          <div className="route-node" style={{ opacity: point.muted ? 0.85 : 1 }}>
            <Code code={point.code} size="md" />
            <span className="city">{point.city}</span>
            {point.dates && <span className="dates">{point.dates}</span>}
          </div>
        </span>
      ))}
    </div>
  );
}

// ---------- user avatar ----------
// Foto quando há; senão, grafismo topográfico determinístico do id + iniciais.
export function UserAvatar({
  seed,
  label,
  avatarUrl,
  size = 34,
}: {
  seed: string;
  label: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const hasPhoto = Boolean(avatarUrl);
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `url(${avatarUrl || topographicAvatar(seed)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    ...(hasPhoto ? {} : { color: "var(--ink)" }),
  };
  return (
    <span aria-label={label} className="avatar" role="img" style={style} title={label}>
      {hasPhoto ? "" : initials(label)}
    </span>
  );
}

// ---------- breadcrumbs ----------
export interface Crumb {
  label: string;
  href?: string;
}
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <div className="breadcrumbs">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: crumb order is stable
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span className="sep">/</span>}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span className="current">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ---------- empty state ----------
export function EmptyState({
  icon = "compass",
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name={icon} size={22} />
      <div style={{ fontWeight: 600, color: "var(--ink-soft)" }}>{title}</div>
      {body && <div style={{ fontSize: 13.5, maxWidth: 420 }}>{body}</div>}
      {action}
    </div>
  );
}

// ---------- status pill ----------
export function StatusPill({ status }: { status: TripStatus }) {
  return <span className={`spill ${status}`}>{TRIP_STATUS_LABEL[status]}</span>;
}

// ---------- progress bar (segmented) ----------
export function Progress({
  value,
  total,
  tone = "accent",
}: {
  value: number;
  total: number;
  tone?: "accent" | "green";
}) {
  const segments = Math.max(total, 0);
  const filled = Math.min(Math.max(value, 0), segments);
  const onClass = tone === "green" ? "green" : "on";
  return (
    <div aria-label={`${filled} de ${segments}`} className="prog" role="img">
      {Array.from({ length: segments }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length segment bar
        <span className={`seg ${i < filled ? onClass : ""}`} key={i} />
      ))}
    </div>
  );
}

// ---------- avatar stack ----------
export interface StackMember {
  seed: string;
  label: string;
  avatarUrl?: string | null;
}
export function AvatarStack({ members, max = 4 }: { members: StackMember[]; max?: number }) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  return (
    <div className="astack">
      {shown.map((m) => (
        <UserAvatar avatarUrl={m.avatarUrl} key={m.seed} label={m.label} seed={m.seed} size={30} />
      ))}
      {overflow > 0 && (
        <span
          aria-label={`mais ${overflow}`}
          className="avatar"
          role="img"
          title={`mais ${overflow}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ---------- mini route (airport codes with arrows) ----------
export function MiniRoute({ codes }: { codes: string[] }) {
  return (
    <span className="miniroute">
      {codes.map((code, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: route order is stable
        <span key={`${code}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {i > 0 && <Icon name="arrowRight" size={11} />}
          <Code code={code} size="sm" />
        </span>
      ))}
    </span>
  );
}

// ---------- countdown (dias até o embarque) ----------
// Renderiza o resultado da derivação `countdown` (lib/dashboard/panel-data):
// passado / hoje / N dias. Lógica fica na derivação testada; aqui só pintura.
export function Countdown({ value }: { value: CountdownValue }) {
  if (value.kind === "past") {
    return (
      <span className="mono" style={{ color: "var(--muted)" }}>
        já passou
      </span>
    );
  }
  if (value.kind === "today") {
    return (
      <span className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>
        é hoje
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
      <span className="mono-num" style={{ fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
        {value.days}
      </span>
      <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
        dia{value.days !== 1 ? "s" : ""}
      </span>
    </span>
  );
}

// ---------- alert card (item de "o que precisa de mim") ----------
// Linha acionável: ícone + título + subtítulo + chevron. Navega via `href`
// (renderiza `Link`) ou dispara `onClick`. Sem href nem onClick → estático
// (modo read-only do Painel de exemplo).
export function AlertCard({
  icon = "alert",
  title,
  sub,
  href,
  onClick,
  tone = "warn",
}: {
  icon?: IconName;
  title: string;
  sub?: string;
  href?: string;
  onClick?: () => void;
  tone?: "warn" | "info";
}) {
  const inner = (
    <>
      <span className="ico">
        <Icon name={icon} size={17} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="ttl" style={{ display: "block" }}>
          {title}
        </span>
        {sub && (
          <span className="sub" style={{ display: "block" }}>
            {sub}
          </span>
        )}
      </span>
      <span className="go">
        <Icon name="chevronRight" size={16} />
      </span>
    </>
  );
  const className = `alert ${tone}`;
  if (href) {
    return (
      <Link className={className} href={href}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button className={className} onClick={onClick} type="button">
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}
