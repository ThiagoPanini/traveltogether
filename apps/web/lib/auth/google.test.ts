import { afterEach, describe, expect, it, vi } from "vitest";
import { isGoogleEnabled, verifyGoogle } from "@/lib/auth/google";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("verifyGoogle", () => {
  it("posta o id_token no endpoint interno e mapeia o usuário do Auth.js", async () => {
    vi.stubEnv("INTERNAL_API_URL", "http://travelmanager-api:8000");
    const body = {
      user: { id: "u-1", email: "viajante@example.com" },
      needs_onboarding: true,
      session_token: "sess-opaco",
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const user = await verifyGoogle("id-token-do-google");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url.toString()).toBe("http://travelmanager-api:8000/auth/google");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ id_token: "id-token-do-google" });
    expect(user).toEqual({
      id: "u-1",
      email: "viajante@example.com",
      accessToken: "sess-opaco",
      needsOnboarding: true,
    });
  });

  it("devolve null quando a API recusa o id_token", async () => {
    vi.stubEnv("INTERNAL_API_URL", "http://travelmanager-api:8000");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ code: "domain_error" }, { status: 401 })),
    );

    expect(await verifyGoogle("token-forjado")).toBeNull();
  });
});

describe("isGoogleEnabled", () => {
  it("é true só quando client id e secret estão configurados", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "abc.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "shh");
    expect(isGoogleEnabled()).toBe(true);
  });

  it("é false sem o secret (degrada para indisponível, não quebra)", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "abc.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(isGoogleEnabled()).toBe(false);
  });

  it("é false sem o client id", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "shh");
    expect(isGoogleEnabled()).toBe(false);
  });
});
