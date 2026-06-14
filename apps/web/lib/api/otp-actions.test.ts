import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestOtp } from "./otp-actions";

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
