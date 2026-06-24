import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, internalApiUrl, withBearer } from "@/lib/bff/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  mockedAuth.mockReset();
});

describe("internalApiUrl", () => {
  it("devolve o valor de INTERNAL_API_URL", () => {
    vi.stubEnv("INTERNAL_API_URL", "http://travelmanager-api:8000");
    expect(internalApiUrl()).toBe("http://travelmanager-api:8000");
  });

  it("falha alto quando INTERNAL_API_URL está ausente", () => {
    vi.stubEnv("INTERNAL_API_URL", undefined);
    expect(() => internalApiUrl()).toThrow(/INTERNAL_API_URL/);
  });
});

describe("withBearer", () => {
  it("anexa Authorization quando há token", () => {
    expect(withBearer(undefined, "tok-123").get("Authorization")).toBe("Bearer tok-123");
  });

  it("não anexa Authorization quando o token é null", () => {
    expect(withBearer(undefined, null).has("Authorization")).toBe(false);
  });
});

describe("apiFetch", () => {
  it("repassa para a API interna anexando o Bearer da sessão", async () => {
    vi.stubEnv("INTERNAL_API_URL", "http://travelmanager-api:8000");
    mockedAuth.mockResolvedValue({ accessToken: "sess-token" });
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/auth/me");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url.toString()).toBe("http://travelmanager-api:8000/auth/me");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer sess-token");
  });

  it("sem sessão, chama a API sem Bearer", async () => {
    vi.stubEnv("INTERNAL_API_URL", "http://travelmanager-api:8000");
    mockedAuth.mockResolvedValue(null);
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/auth/me");

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).has("Authorization")).toBe(false);
  });
});
