import { mirrorJson } from "@/lib/bff/mirror";
import { acceptInvitation } from "@/lib/bff/server";

/**
 * Proxy do BFF para aceitar um Convite (ADR-0002/0004). Repassa o aceite para a API
 * com o Bearer da sessão e espelha status + corpo (`{trip_id}`) — inclusive o 403 de
 * e-mail divergente e o 404 de convite inexistente, sem mascarar.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return mirrorJson(await acceptInvitation(id));
}
