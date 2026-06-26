import { mirrorJson } from "@/lib/bff/mirror";
import { revokeInvitation } from "@/lib/bff/server";

/**
 * Proxy do BFF para revogar um Convite pendente (Organizador — ADR-0002/0004).
 * Espelha status **e corpo** via `mirrorJson`, como os demais handlers: o 204 de sucesso
 * colapsa pra corpo vazio; o 403/404 carrega o `{code, detail}` estável (contrato com o
 * web). Sem isto o cliente não distinguiria "não autorizado" de "já não existe".
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return mirrorJson(await revokeInvitation(id));
}
