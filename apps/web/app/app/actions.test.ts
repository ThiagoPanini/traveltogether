import { afterEach, describe, expect, it, vi } from "vitest";

const { apiFetch, signOut } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/bff/server", () => ({ apiFetch }));
vi.mock("@/auth", () => ({ signOut }));

import { logout } from "./actions";

afterEach(() => {
  apiFetch.mockReset();
  signOut.mockReset();
});

describe("logout (server action)", () => {
  it("revoga a sessão na API e limpa o cookie, voltando ao login", async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 204 }));

    await logout();

    expect(apiFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/entrar" });
  });

  it("revoga na API antes de limpar o cookie (o Bearer precisa estar vivo)", async () => {
    const order: string[] = [];
    apiFetch.mockImplementation(async () => {
      order.push("revoke");
      return new Response(null, { status: 204 });
    });
    signOut.mockImplementation(async () => {
      order.push("signout");
    });

    await logout();

    expect(order).toEqual(["revoke", "signout"]);
  });
});
