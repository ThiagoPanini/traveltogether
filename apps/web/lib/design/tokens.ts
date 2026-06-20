// Catálogo dos tokens do Tema B · Noturno (fonte-da-verdade: docs/design/tokens.json).
// Espelha os valores como CSS custom properties consumíveis em todo o app.

export type ColorToken = { name: string; cssVar: string; value: string };

export const colorTokens: ColorToken[] = [
  // Fundos
  { name: "bg-root", cssVar: "--bg-root", value: "#0f171e" },
  { name: "bg-canvas", cssVar: "--bg-canvas", value: "#14202b" },
  { name: "bg-inset", cssVar: "--bg-inset", value: "#101920" },
  { name: "surface", cssVar: "--surface", value: "#1a2530" },
  { name: "surface-bar", cssVar: "--surface-bar", value: "#1e2a35" },
  { name: "fill-subtle", cssVar: "--fill-subtle", value: "#243240" },
  { name: "fill-accent", cssVar: "--fill-accent", value: "#33231e" },
  // Linhas
  { name: "line", cssVar: "--line", value: "#2b3945" },
  { name: "line-muted", cssVar: "--line-muted", value: "#33424f" },
  { name: "line-dashed", cssVar: "--line-dashed", value: "#3a4a57" },
  { name: "line-strong", cssVar: "--line-strong", value: "#4a5a66" },
  { name: "line-faint", cssVar: "--line-faint", value: "#5a6570" },
  // Texto
  { name: "text-bright", cssVar: "--text-bright", value: "#f4ecda" },
  { name: "text-body", cssVar: "--text-body", value: "#e9e1cf" },
  { name: "text-muted", cssVar: "--text-muted", value: "#9aa7b1" },
  { name: "text-mono", cssVar: "--text-mono", value: "#8a96a0" },
  { name: "text-faint", cssVar: "--text-faint", value: "#7d8a93" },
  { name: "text-faintest", cssVar: "--text-faintest", value: "#6b7680" },
  // Acentos e semântica
  { name: "accent", cssVar: "--accent", value: "#df6a4d" },
  { name: "accent-alert", cssVar: "--accent-alert", value: "#e8856e" },
  { name: "on-accent", cssVar: "--on-accent", value: "#14202b" },
  { name: "success", cssVar: "--success", value: "#4fa58e" },
  { name: "warning", cssVar: "--warning", value: "#e0a948" },
];

// Todos os nomes de var expostos no :root (inclui rgba, raios, bordas, layout, sombra).
export const allCssVars: string[] = [
  ...colorTokens.map((t) => t.cssVar),
  "--success-border",
  "--warning-border",
  "--accent-border",
  "--radius-circle",
  "--radius-pill",
  "--radius-lg",
  "--radius-md",
  "--radius-card",
  "--radius-sm",
  "--radius-btn",
  "--radius-bar",
  "--border-hairline",
  "--border-outline",
  "--border-accent-edge",
  "--page-gutter",
  "--max-width-wide",
  "--max-width-panel",
  "--hero-max",
  "--login-card",
  "--shadow-switcher",
];

// Variáveis de fonte injetadas por next/font (não definidas no :root, mas usadas).
export const fontVars: string[] = ["--font-display", "--font-body", "--font-mono"];

export type TypeScaleToken = {
  role: string;
  family: "display" | "body" | "mono";
  size: string;
  weight: number;
};

export const typeScale: TypeScaleToken[] = [
  { role: "hero", family: "display", size: "74px", weight: 700 },
  { role: "h1", family: "display", size: "56px", weight: 700 },
  { role: "h2", family: "display", size: "42px", weight: 700 },
  { role: "card-title", family: "display", size: "20px", weight: 600 },
  { role: "body-lg", family: "body", size: "17px", weight: 400 },
  { role: "body", family: "body", size: "15px", weight: 400 },
  { role: "body-sm", family: "body", size: "13px", weight: 500 },
  { role: "mono-label", family: "mono", size: "12px", weight: 500 },
  { role: "mono-caption", family: "mono", size: "9px", weight: 400 },
];
