// Modelo de navegação do casco Espresso. Mantido puro para teste: a definição
// dos itens e a resolução de "ativo" não dependem de React nem do roteador. O
// AppShell consome estes dados e mapeia `icon` para um SVG.
//
// Rodada 0 (prototype-first): o protótipo validou três itens, mas só Início tem
// destino próprio (o Painel). Viagens e Perfil ficam inertes ("em breve") — o
// protótipo não lhes deu tela e não inventamos uma. Ver DESIGN.md / ADR-0020.

/** Ícone de cada item; o casco resolve para o SVG Espresso correspondente. */
export type NavIcon = "home" | "route" | "user";

/** Chave estável de cada item de navegação. */
export type NavKey = "inicio" | "viagens" | "perfil";

export interface NavItem {
  key: NavKey;
  /** Rótulo na sidebar. */
  label: string;
  icon: NavIcon;
  /** Destino roteável, ou `null` para item inerte ("em breve") sem tela própria. */
  href: string | null;
}

/** Itens do casco, na ordem do protótipo. */
export const NAV_ITEMS: NavItem[] = [
  { key: "inicio", label: "Início", icon: "home", href: "/overview" },
  { key: "viagens", label: "Viagens", icon: "route", href: null },
  { key: "perfil", label: "Perfil", icon: "user", href: null },
];

/** Item com destino — navega; o casco o renderiza como link, não como rótulo morto. */
export function isResolved(item: NavItem): item is NavItem & { href: string } {
  return item.href !== null;
}

/**
 * Item ativo quando a rota é exatamente o href ou um sub-caminho dele.
 * Itens inertes (sem href) nunca ficam ativos.
 */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.href === null) return false;
  if (pathname === item.href) return true;
  return pathname.startsWith(`${item.href}/`);
}
