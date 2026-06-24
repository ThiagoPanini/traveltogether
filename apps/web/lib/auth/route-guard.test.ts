import { describe, expect, it } from "vitest";
import { guardRoute } from "@/lib/auth/route-guard";

describe("guardRoute (proteção de /app)", () => {
  it("barra /app sem sessão, mandando para o login", () => {
    expect(guardRoute({ pathname: "/app", isLoggedIn: false, needsOnboarding: false })).toBe(
      "/entrar",
    );
  });

  it("desvia /app de quem tem sessão mas ainda não onboardou", () => {
    expect(guardRoute({ pathname: "/app", isLoggedIn: true, needsOnboarding: true })).toBe(
      "/onboarding",
    );
  });

  it("deixa /app passar quem tem sessão e já onboardou", () => {
    expect(guardRoute({ pathname: "/app", isLoggedIn: true, needsOnboarding: false })).toBeNull();
  });

  it("não toca em rotas públicas, mesmo sem sessão", () => {
    for (const pathname of ["/", "/tokens", "/entrar", "/onboarding"]) {
      expect(guardRoute({ pathname, isLoggedIn: false, needsOnboarding: false })).toBeNull();
    }
  });
});
