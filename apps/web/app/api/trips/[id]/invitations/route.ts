import { mirrorJson } from "@/lib/bff/mirror";
import { inviteToTrip } from "@/lib/bff/server";

/**
 * Proxy do BFF para convidar alguém a uma Viagem já criada (Organizador —
 * ADR-0002/0004). Barra corpo malformado (sem `email`/`role` válido) e espelha o
 * status da API (201 no sucesso; 403 não-organizador; 409 convite vivo duplicado).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    role?: unknown;
  } | null;
  if (
    !body ||
    typeof body.email !== "string" ||
    (body.role !== "member" && body.role !== "organizer")
  ) {
    return new Response(null, { status: 400 });
  }
  return mirrorJson(await inviteToTrip(id, { email: body.email, role: body.role }));
}
