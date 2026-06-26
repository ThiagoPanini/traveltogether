/**
 * Espelhamento de resposta upstream (ADR-0004) — plumbing puro, sem dependência de
 * `@/auth`. Isolado de `@/lib/bff/server` de propósito: os route handlers e seus
 * testes usam `mirrorJson` sem arrastar o NextAuth (que não resolve `next/server`
 * fora do runtime do Next).
 */

/**
 * Repassa o status e o corpo JSON de uma resposta da API interna para o cliente do
 * BFF, sem mascarar — inclui o `{code, detail}` de erro, que é contrato com o web.
 */
export async function mirrorJson(upstream: Response): Promise<Response> {
  const body = await upstream.text();
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  return new Response(body || null, { status: upstream.status, headers });
}
