"use client";

import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Luggage,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { logout } from "./actions";
import styles from "./app-shell.module.css";

export type ShellTrip = {
  id: string;
  name: string;
  destination_city: string;
  my_role: "organizer" | "member";
};

export type ShellUser = {
  nameLabel: string;
  originLabel: string;
  originMeta: string;
  initial: string;
};

export type ShellData = {
  user: ShellUser;
  trips: ShellTrip[];
  invitationCount: number;
};

type AppShellProps = {
  children: ReactNode;
  shell: ShellData;
};

const COLLAPSED_KEY = "travelmanager.sidebar.collapsed";

/** Shell autenticado: navegação persistente em `/app/**`, com colapso local e ícones coesos. */
export function AppShell({ children, shell }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(globalThis.localStorage.getItem(COLLAPSED_KEY) === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      globalThis.localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const context = useMemo(() => {
    if (pathname === "/app/viagens/nova") return "Nova viagem";
    if (pathname.startsWith("/app/viagens/")) return "Painel da viagem";
    return "Painel de bordo";
  }, [pathname]);

  const tripActive = pathname.startsWith("/app/viagens") && pathname !== "/app/viagens/nova";
  const createActive = pathname === "/app/viagens/nova";

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
      <aside className={styles.sidebar} aria-label="Menu principal">
        <div className={styles.sidebarHead}>
          <Link href="/app" className={styles.brand} aria-label="travelmanager — painel">
            <span className={styles.brandMark} aria-hidden="true">
              <Sparkles size={14} strokeWidth={1.9} />
            </span>
            <span className={styles.brandText}>travel·manager</span>
          </Link>
          <button
            type="button"
            className={styles.toggle}
            aria-label={collapsed ? "Expandir menu" : "Compactar menu"}
            aria-pressed={collapsed}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        </div>

        <nav className={styles.primaryNav} aria-label="Navegação do painel">
          <Link
            href="/app"
            className={`${styles.navItem} ${pathname === "/app" ? styles.navItemActive : ""}`}
            aria-current={pathname === "/app" ? "page" : undefined}
            title="Painel"
          >
            <LayoutDashboard size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className={styles.navLabel}>Painel</span>
          </Link>
          <Link
            href="/app#viagens"
            className={`${styles.navItem} ${tripActive ? styles.navItemActive : ""}`}
            aria-current={tripActive ? "page" : undefined}
            title="Minhas viagens"
          >
            <Luggage size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className={styles.navLabel}>Minhas viagens</span>
            <strong className={styles.navCount}>{shell.trips.length}</strong>
          </Link>
          <Link href="/app#convites" className={styles.navItem} title="Convites">
            <Mail size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className={styles.navLabel}>Convites</span>
            <strong className={`${styles.navCount} ${styles.inviteBadge}`}>
              {shell.invitationCount}
            </strong>
          </Link>
        </nav>

        <Link
          href="/app/viagens/nova"
          className={`${styles.sidebarCta} ${createActive ? styles.sidebarCtaActive : ""}`}
          aria-current={createActive ? "page" : undefined}
          title="Nova viagem"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          <span>Nova viagem</span>
        </Link>

        <div className={styles.profileCard}>
          <span className={styles.avatar} aria-hidden="true">
            {shell.user.initial}
          </span>
          <div className={styles.profileText}>
            <strong className={styles.profileName}>{shell.user.nameLabel}</strong>
            <small className={styles.profileMeta}>{shell.user.originMeta}</small>
          </div>
          <form action={logout}>
            <button type="submit" className={styles.signout} aria-label="Sair" title="Sair">
              <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <p>
            Área de embarque <span aria-hidden="true">→</span> <strong>{context}</strong>
          </p>
          <p>
            <span aria-hidden="true" /> Base ativa · {shell.user.originLabel}
          </p>
        </header>
        <div className={styles.workspaceContent}>{children}</div>
      </div>

      <nav className={styles.mobileTabs} aria-label="Navegação principal">
        <Link href="/app" aria-current={pathname === "/app" ? "page" : undefined}>
          <LayoutDashboard size={17} strokeWidth={1.8} aria-hidden="true" />
          Painel
        </Link>
        <Link href="/app#viagens" aria-current={tripActive ? "page" : undefined}>
          <Luggage size={17} strokeWidth={1.8} aria-hidden="true" />
          Viagens
        </Link>
        <Link
          href="/app/viagens/nova"
          className={styles.mobileCreate}
          aria-current={createActive ? "page" : undefined}
        >
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
          Criar
        </Link>
        <Link href="/app#convites">
          <ClipboardList size={17} strokeWidth={1.8} aria-hidden="true" />
          Convites
        </Link>
      </nav>
    </div>
  );
}
