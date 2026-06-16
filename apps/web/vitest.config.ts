import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve o alias `@/…` (mesmo do tsconfig) também nos testes — os componentes
  // importam por ele em runtime, ao contrário do código de lib que só o usa em
  // imports de tipo (apagados na transpilação).
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // O tsconfig usa `jsx: "preserve"` (o Next transpila a JSX). Para os testes,
  // o transform do Vitest (rolldown/oxc) precisa emitir a JSX no runtime
  // automático do React, senão o parser SSR reclama de "Unexpected JSX
  // expression".
  oxc: { jsx: { runtime: "automatic", importSource: "react" } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
  },
});
