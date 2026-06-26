import { afterEach, describe, expect, it, vi } from "vitest";

const { revokeInvitation } = vi.hoisted(() => ({ revokeInvitation: vi.fn() }));
vi.mock("@/lib/bff/server", () => ({ revokeInvitation }));

import { DELETE } from "./route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => revokeInvitation.mockReset());

describe("DELETE /api/invitations/[id]", () => {
  it("revoga o convite e espelha o 204 da API", async () => {
    revokeInvitation.mockResolvedValue(new Response(null, { status: 204 }));

    const res = await DELETE(new Request("http://web", { method: "DELETE" }), ctx("inv-1"));

    expect(revokeInvitation).toHaveBeenCalledWith("inv-1");
    expect(res.status).toBe(204);
  });

  it("espelha o 403 de não-organizador sem mascarar", async () => {
    revokeInvitation.mockResolvedValue(new Response(null, { status: 403 }));

    const res = await DELETE(new Request("http://web", { method: "DELETE" }), ctx("inv-2"));

    expect(res.status).toBe(403);
  });

  it("espelha o corpo {code, detail} num 404 (contrato de erro com o web)", async () => {
    revokeInvitation.mockResolvedValue(
      new Response(
        JSON.stringify({ code: "invitation_not_found", detail: "convite não encontrado" }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );

    const res = await DELETE(new Request("http://web", { method: "DELETE" }), ctx("inv-3"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      code: "invitation_not_found",
      detail: "convite não encontrado",
    });
  });
});
