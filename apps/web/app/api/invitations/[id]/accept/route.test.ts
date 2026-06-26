import { afterEach, describe, expect, it, vi } from "vitest";

const { acceptInvitation } = vi.hoisted(() => ({ acceptInvitation: vi.fn() }));
vi.mock("@/lib/bff/server", () => ({ acceptInvitation }));

import { POST } from "./route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => acceptInvitation.mockReset());

describe("POST /api/invitations/[id]/accept", () => {
  it("aceita o convite e espelha status + corpo ({trip_id})", async () => {
    acceptInvitation.mockResolvedValue(
      new Response(JSON.stringify({ trip_id: "trip-9" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await POST(new Request("http://web"), ctx("inv-1"));

    expect(acceptInvitation).toHaveBeenCalledWith("inv-1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trip_id: "trip-9" });
  });

  it("espelha o 403 de e-mail divergente sem mascarar", async () => {
    acceptInvitation.mockResolvedValue(
      new Response(JSON.stringify({ code: "invitation_email_mismatch", detail: "x" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await POST(new Request("http://web"), ctx("inv-2"));

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("invitation_email_mismatch");
  });
});
