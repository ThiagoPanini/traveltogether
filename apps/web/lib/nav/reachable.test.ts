import { describe, expect, it } from "vitest";

import { isReachablePath } from "./reachable";

// Rodada 0 (chassi Espresso) fecha a superfície ao que o protótipo validou:
// casco + Painel (Início) + wizard de cadastro, mais home pública e login.
// Tudo o mais — miolo profundo da Viagem e laterais globais — fica INACESSÍVEL
// (ADR-0020, issue #163). Código segue no repo, dormente; só o acesso some.

describe("isReachablePath", () => {
  it("a superfície prototipada da rodada 0 é alcançável", () => {
    for (const path of ["/", "/login", "/overview", "/trips/new"]) {
      expect(isReachablePath(path)).toBe(true);
    }
  });

  it("tolera barra final", () => {
    expect(isReachablePath("/overview/")).toBe(true);
    expect(isReachablePath("/trips/new/")).toBe(true);
  });

  it("o miolo profundo da Viagem é inacessível", () => {
    for (const path of [
      "/trips",
      "/trips/abc",
      "/trips/abc/edit",
      "/trips/abc/members",
      "/trips/abc/legs/l1",
      "/trips/abc/legs/l1/compare",
      "/trips/abc/stops/s1/itinerary",
      "/trips/abc/t/rota",
    ]) {
      expect(isReachablePath(path)).toBe(false);
    }
  });

  it("as laterais globais são inacessíveis", () => {
    for (const path of ["/tasks", "/activity", "/notifications", "/profile"]) {
      expect(isReachablePath(path)).toBe(false);
    }
  });
});
