import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allCssVars, colorTokens, fontVars } from "./tokens";

const globalsCss = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

describe("tokens do Noturno em globals.css", () => {
  it("define todas as CSS vars do catálogo no :root", () => {
    for (const cssVar of allCssVars) {
      expect(globalsCss).toContain(`${cssVar}:`);
    }
  });

  it("cada cor do catálogo aparece com seu valor hex", () => {
    for (const token of colorTokens) {
      expect(globalsCss).toContain(`${token.cssVar}: ${token.value}`);
    }
  });

  it("aplica as 3 famílias de fonte via var()", () => {
    for (const fontVar of fontVars) {
      expect(globalsCss).toContain(`var(${fontVar})`);
    }
  });

  it("define altura fixa do painel do mapa da criação", () => {
    expect(globalsCss).toContain("--map-panel-height: 460px");
  });
});
