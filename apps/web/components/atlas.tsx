import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { topographicAvatar } from "@/lib/identity/avatar";
import { initials } from "@/lib/identity/user-display";

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
};

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
