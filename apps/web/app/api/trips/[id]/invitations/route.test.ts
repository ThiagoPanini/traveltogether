import { afterEach, describe, expect, it, vi } from "vitest";

const { inviteToTrip } = vi.hoisted(() => ({ inviteToTrip: vi.fn() }));
vi.mock("@/lib/bff/server", () => ({ inviteToTrip }));

import { POST } from "./route";

function post(id: string, body: unknown) {
  return [
    new Request("http://web", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) },
  ] as const;
}

afterEach(() => inviteToTrip.mockReset());

describe("POST /api/trips/[id]/invitations", () => {
  it("convida e espelha status + corpo no sucesso", async () => {
    inviteToTrip.mockResolvedValue(
      new Response(JSON.stringify({ id: "inv-1", email: "a@b.com", role: "member" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await POST(...post("trip-1", { email: "a@b.com", role: "member" }));

    expect(inviteToTrip).toHaveBeenCalledWith("trip-1", { email: "a@b.com", role: "member" });
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("inv-1");
  });

  it("espelha o 409 de convite vivo duplicado", async () => {
    inviteToTrip.mockResolvedValue(
      new Response(JSON.stringify({ code: "invitation_exists", detail: "x" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await POST(...post("trip-1", { email: "a@b.com", role: "organizer" }));

    expect(res.status).toBe(409);
  });

  it("rejeita papel inválido com 400, sem chamar a API", async () => {
    const res = await POST(...post("trip-1", { email: "a@b.com", role: "admin" }));

    expect(res.status).toBe(400);
    expect(inviteToTrip).not.toHaveBeenCalled();
  });
});
