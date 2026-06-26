import { afterEach, describe, expect, it, vi } from "vitest";

const { createTrip } = vi.hoisted(() => ({ createTrip: vi.fn() }));
vi.mock("@/lib/bff/server", () => ({ createTrip }));

import { POST } from "./route";

function post(body: unknown): Request {
  return new Request("http://web/api/trips", { method: "POST", body: JSON.stringify(body) });
}

const validBody = {
  name: "Costa Leste",
  description: null,
  departure_date: null,
  entry_transfer: null,
  stops: [{ city: "Nova York", country: "US", arrival_date: null, desired_transfer: null }],
  invitations: [],
};

afterEach(() => createTrip.mockReset());

describe("POST /api/trips", () => {
  it("repassa o payload à API e espelha status + corpo (com o id) no sucesso", async () => {
    createTrip.mockResolvedValue(
      new Response(JSON.stringify({ id: "trip-1", name: "Costa Leste" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await POST(post(validBody));

    expect(createTrip).toHaveBeenCalledWith(validBody);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "trip-1", name: "Costa Leste" });
  });

  it("espelha o 422 da API (nome obrigatório) sem mascarar", async () => {
    createTrip.mockResolvedValue(
      new Response(JSON.stringify({ code: "trip_name_required", detail: "x" }), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await POST(post({ ...validBody, name: "" }));

    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("trip_name_required");
  });

  it("rejeita corpo malformado com 400, sem chamar a API", async () => {
    const res = await POST(post({ name: 42 }));

    expect(res.status).toBe(400);
    expect(createTrip).not.toHaveBeenCalled();
  });

  it("rejeita corpo sem stops com 400", async () => {
    const res = await POST(post({ name: "X" }));

    expect(res.status).toBe(400);
    expect(createTrip).not.toHaveBeenCalled();
  });
});
