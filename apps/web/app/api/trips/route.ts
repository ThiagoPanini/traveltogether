import { mirrorJson } from "@/lib/bff/mirror";
import { createTrip } from "@/lib/bff/server";
import type { TripCreateIn } from "@/lib/trips/draft";

/**
 * Proxy do BFF para a criação de viagem (ADR-0004/0011). O browser fala com esta
 * rota; ela repassa server-to-server com o Bearer da sessão (`apiFetch`). Barra
 * corpo malformado (sem `name`/`stops`); a validação semântica (nome obrigatório,
 * limites) é da API — o status (inclusive 422) é espelhado sem mascarar. Repassa o
 * corpo JSON da resposta (o `TripBackbone` com `id`) para o cliente navegar.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    stops?: unknown;
  } | null;
  if (!body || typeof body.name !== "string" || !Array.isArray(body.stops)) {
    return new Response(null, { status: 400 });
  }
  const upstream = await createTrip(body as TripCreateIn);
  return mirrorJson(upstream);
}
