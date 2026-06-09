import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";

import { createApiAccessToken } from "./api-token";

describe("createApiAccessToken", () => {
  it("assina token HS256 com email normalizado", async () => {
    const secret = "public-test-auth-secret-not-for-production";
    const token = await createApiAccessToken(" ALICE@EXAMPLE.COM ", { secret });
    const { payload, protectedHeader } = await jwtVerify(token, new TextEncoder().encode(secret));

    expect(protectedHeader.alg).toBe("HS256");
    expect(payload.sub).toBe("alice@example.com");
    expect(payload.email).toBe("alice@example.com");
  });
});
