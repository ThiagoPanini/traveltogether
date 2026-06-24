import { auth } from "@/auth";

/**
 * Plumbing do BFF (ADR-0011): repassa chamadas server-side para a API interna,
 * anexando o token opaco da sessão como `Bearer`. A API nunca é pública — só a
 * rede interna alcança `INTERNAL_API_URL`.
 */

/** Endereço da API interna; falha alto se não configurado (cabeado na #196). */
export function internalApiUrl(): string {
  const base = process.env.INTERNAL_API_URL;
  if (!base) {
    throw new Error("INTERNAL_API_URL não configurada");
  }
  return base;
}

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
