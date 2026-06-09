import { describe, expect, it } from "vitest";

import { authorizeEmailForAccess } from "./access-gate";

describe("authorizeEmailForAccess", () => {
  it("autoriza e normaliza e-mail presente na allowlist", () => {
    const user = authorizeEmailForAccess(" ALICE@EXAMPLE.COM ", {
      AUTH_ALLOWLIST: "alice@example.com,bob@example.com",
    });

    expect(user).toEqual({ id: "alice@example.com", email: "alice@example.com" });
  });

  it("bloqueia e-mail ausente da allowlist", () => {
    const user = authorizeEmailForAccess("eve@example.com", {
      AUTH_ALLOWLIST: "alice@example.com,bob@example.com",
    });

    expect(user).toBeNull();
  });
});
