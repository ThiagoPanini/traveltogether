import { auth } from "@/auth";
import { internalApiUrl } from "@/lib/bff/url";
import type { InviteRole, TripCreateIn } from "@/lib/trips/draft";

/**
 * Plumbing do BFF (ADR-0004): repassa chamadas server-side para a API interna,
 * anexando o token opaco da sessão como `Bearer`. A API nunca é pública — só a
 * rede interna alcança `INTERNAL_API_URL`.
 */

// Reexportado para não quebrar quem importa `internalApiUrl` daqui; a fonte é
// `@/lib/bff/url` (sem dependência de NextAuth — ver módulo).
export { internalApiUrl };

// `mirrorJson` mora em `@/lib/bff/mirror` (puro, sem `@/auth`); reexportado aqui por
// conveniência de quem já importa o plumbing do BFF deste módulo.
export { mirrorJson } from "@/lib/bff/mirror";

/** Cabeçalhos com `Authorization: Bearer <token>` quando há token de sessão. */
export function withBearer(headers: HeadersInit | undefined, token: string | null): Headers {
  const merged = new Headers(headers);
  if (token) {
    merged.set("Authorization", `Bearer ${token}`);
  }
  return merged;
}

/** O token opaco que a API cunhou, carregado na sessão do Auth.js. */
function sessionToken(session: { accessToken?: string } | null): string | null {
  return session?.accessToken ?? null;
}

/** Fetch server-side para a API interna, já com o Bearer da sessão corrente. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await auth();
  const token = sessionToken(session as { accessToken?: string } | null);
  const url = new URL(path, internalApiUrl());
  const { headers, ...rest } = init;
  return fetch(url, { ...rest, headers: withBearer(headers, token) });
}

/** Perfil mínimo do onboarding, no formato que a API espera (`POST /auth/profile`). */
export type ProfilePayload = {
  display_name: string;
  origin_city: string;
  country: string;
};

/** Grava o Perfil do onboarding na API interna (autenticado); devolve a resposta crua. */
export async function completeOnboarding(payload: ProfilePayload): Promise<Response> {
  return apiFetch("/auth/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Cria a Viagem (criação atômica — ADR-0011); devolve a resposta crua (`TripBackbone`). */
export async function createTrip(payload: TripCreateIn): Promise<Response> {
  return apiFetch("/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Aceita um Convite pendente; vira Participação com o papel do Convite (ADR-0002). */
export async function acceptInvitation(id: string): Promise<Response> {
  return apiFetch(`/invitations/${encodeURIComponent(id)}/accept`, { method: "POST" });
}

/** Revoga um Convite pendente (Organizador); libera o e-mail pra re-convite. */
export async function revokeInvitation(id: string): Promise<Response> {
  return apiFetch(`/invitations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Convida alguém para uma Viagem já criada (Organizador). */
export async function inviteToTrip(
  tripId: string,
  body: { email: string; role: InviteRole },
): Promise<Response> {
  return apiFetch(`/trips/${encodeURIComponent(tripId)}/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
