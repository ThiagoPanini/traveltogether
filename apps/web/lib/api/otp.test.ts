import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestOtp, verifyOtp } from "./otp";

const API_URL = "http://localhost:8000";

beforeEach(() => {
  vi.stubEnv("TRAVELTOGETHER_API_URL", API_URL);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("requestOtp", () => {
  it("posta para /identity/otp/request e retorna true em 200", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"status":"sent"}', { status: 200 }));
    const result = await requestOtp("alice@example.com");
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/identity/otp/request`, expect.any(Object));
    expect(result).toBe(true);
  });

  it("retorna false em 429 (rate limit)", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 429 }));
    const result = await requestOtp("alice@example.com");
    expect(result).toBe(false);
  });
});

describe("verifyOtp", () => {
  it("retorna email em resposta válida", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('{"valid":true,"email":"alice@example.com"}', { status: 200 }),
    );
    const result = await verifyOtp("alice@example.com", "123456");
    expect(result).toEqual({ valid: true, email: "alice@example.com" });
  });

  it("retorna {valid: false} em código errado", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('{"valid":false,"email":null}', { status: 200 }),
    );
    const result = await verifyOtp("alice@example.com", "000000");
    expect(result).toEqual({ valid: false, email: null });
  });
});
