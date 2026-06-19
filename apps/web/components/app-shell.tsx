"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { type ReactNode, useState } from "react";

import { displayLabel, initials } from "@/lib/identity/user-display";
import { isNavActive, NAV_ITEMS, type NavIcon, type NavItem } from "@/lib/nav/items";

export interface ShellUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url?: string | null;
}

// Ícones Espresso do casco (self-contained — o casco não depende do conjunto
// Atlas, que está em sunset). Stroke herda currentColor.
const ICONS: Record<NavIcon | "plus" | "signout", ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 9.5V21h14V9.5" />,
  route: (
    <>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H14a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h5.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  signout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

function Glyph({ name, size = 17 }: { name: keyof typeof ICONS; size?: number }) {
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
      {ICONS[name]}
    </svg>
  );
}

/** Marca circular (bússola estilizada) — pura CSS via .brand-mark. */
function Brand() {
  return (
    <Link className="brand" href="/overview">
      <span className="brand-mark" />
      traveltogether
    </Link>
  );
}

/** Lista de itens da nav; Início navega, Viagens/Perfil ficam inertes. */
function NavList({ pathname }: { pathname: string }) {
  return (
    <>
      <span className="kicker side-label">Menu</span>
      <nav className="side-nav" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => (
          <NavRow key={item.key} item={item} pathname={pathname} />
        ))}
      </nav>
    </>
  );
}

function NavRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const inner = (
    <>
      <span className="tab" />
      <span className="ico">
        <Glyph name={item.icon} />
      </span>
      {item.label}
    </>
  );

  if (item.href === null) {
    return (
      <span className="side-link inert" aria-disabled="true">
        {inner}
        <span className="soon">em breve</span>
      </span>
    );
  }

  const active = isNavActive(item, pathname);
  return (
    <Link
      className={`side-link ${active ? "active" : ""}`}
      href={item.href}
      aria-current={active ? "page" : undefined}
    >
      {inner}
    </Link>
  );
}

/** Chip de identidade com logout pendurado. */
function IdentityChip({ user }: { user: ShellUser }) {
  const label = displayLabel(user);
  return (
    <div className="side-user">
      <span className="avatar" style={{ width: 34, height: 34, fontSize: 15 }}>
        {initials(label)}
      </span>
      <div className="who">
        <span className="nm">{label}</span>
        <span className="em">conta pessoal</span>
      </div>
      <button
        type="button"
        className="signout"
        aria-label="Sair"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <Glyph name="signout" size={16} />
      </button>
    </div>
  );
}

/** Conteúdo compartilhado entre sidebar (desktop) e drawer (mobile). */
function NavColumn({ user, pathname }: { user: ShellUser; pathname: string }) {
  return (
    <>
      <Brand />
      <Link className="btn accent side-cta" href="/trips/new">
        <Glyph name="plus" size={14} /> Nova viagem
      </Link>
      <NavList pathname={pathname} />
      <IdentityChip user={user} />
    </>
  );
}

/** Fundo "deriva/respira" do conteúdo. */
function AppBackground() {
  return (
    <svg
      className="app-bg"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g fill="none" stroke="var(--accent)" strokeWidth="1.1" opacity="0.15">
        <path d="M-40 250 C 120 200, 200 320, 360 270 S 640 180, 860 250" />
        <path d="M-40 360 C 120 320, 220 440, 380 380 S 660 290, 860 370" />
        <path d="M-40 470 C 140 430, 220 540, 400 490 S 680 400, 860 480" />
        <path d="M-40 580 C 150 540, 250 630, 420 590 S 700 520, 860 580" />
      </g>
    </svg>
  );
}

/**
 * AppShell: casco persistente das telas logadas (chassi Espresso, ADR-0020).
 * Sidebar de 3 itens no desktop; header + drawer no mobile. Só Início resolve
 * para tela construída (o Painel); Viagens e Perfil ficam inertes ("em breve").
 */
export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="app">
      <aside className="sidebar">
        <NavColumn user={user} pathname={pathname} />
      </aside>

      <div className="app-main">
        <AppBackground />
        <div className="mtop">
          <button
            type="button"
            className="burger"
            aria-label="Abrir menu"
            onClick={() => setDrawerOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <Brand />
        </div>

        <div className="app-content">{children}</div>
      </div>

      {drawerOpen && (
        <>
          <button
            type="button"
            className="drawer-scrim"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="drawer">
            <NavColumn user={user} pathname={pathname} />
          </aside>
        </>
      )}
    </div>
  );
}
