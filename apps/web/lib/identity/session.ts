export function hasApiAccessToken(session: unknown): session is { apiAccessToken: string } {
  if (!session || typeof session !== "object") return false;

  const { apiAccessToken } = session as { apiAccessToken?: unknown };
  return typeof apiAccessToken === "string" && apiAccessToken.length > 0;
}

/**
 * Destino da raiz `/` na rodada 0 (chassi Espresso): a landing antiga dorme,
 * então `/` apenas redireciona — logado vai ao Painel, deslogado ao Login.
 */
export function rootRedirectTarget(session: unknown): "/overview" | "/login" {
  return hasApiAccessToken(session) ? "/overview" : "/login";
}
