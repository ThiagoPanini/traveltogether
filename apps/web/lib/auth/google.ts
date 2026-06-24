import type { VerifiedUser } from "@/lib/auth/otp";
import { internalApiUrl } from "@/lib/bff/url";

/**
 * Cliente server-side do sign-in com Google contra a API interna (ADR-0004). O web
 * faz a dança OAuth (Auth.js) e obtém o `id_token`; este módulo o repassa à API, que
 * verifica a prova via JWKS e cunha a sessão. O token opaco devolvido é o que o
 * Auth.js guarda no cookie httpOnly — nunca exposto ao browser.
 */

/**
 * Se o sign-in com Google está disponível neste deploy. Sem `GOOGLE_CLIENT_ID`/
 * `SECRET` (entram no go-live #196), o provider não é cabeado e o botão degrada para
 * "indisponível" — espelha o `deploy.yml` que se auto-pula sem token, sem quebrar a
 * tela.
 */
export function isGoogleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Verifica o `id_token` do Google na API; devolve o usuário cunhado ou `null`. */
export async function verifyGoogle(idToken: string): Promise<VerifiedUser | null> {
  const url = new URL("/auth/google", internalApiUrl());
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as {
    user: { id: string; email: string };
    needs_onboarding: boolean;
    session_token: string;
  };
  return {
    id: data.user.id,
    email: data.user.email,
    accessToken: data.session_token,
    needsOnboarding: data.needs_onboarding,
  };
}
