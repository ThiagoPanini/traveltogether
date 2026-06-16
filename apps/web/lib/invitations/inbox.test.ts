import type { InviteForUserPublic } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { buildInboxView } from "./inbox";

function invite(over: Partial<InviteForUserPublic> & { id: string }): InviteForUserPublic {
  return {
    trip_id: "t",
    trip_name: "Viagem",
    email: "eu@exemplo.com",
    role: "member",
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("buildInboxView", () => {
  it("sem convites: count 0 e lista vazia", () => {
    const view = buildInboxView([]);
    expect(view.count).toBe(0);
    expect(view.items).toEqual([]);
  });

  it("um convite: headline no singular", () => {
    const view = buildInboxView([invite({ id: "a" })]);
    expect(view.count).toBe(1);
    expect(view.headline).toBe("1 convite pendente");
  });

  it("vários convites: headline no plural e ordem do mais novo ao mais antigo", () => {
    const view = buildInboxView([
      invite({ id: "velho", created_at: "2026-01-01T00:00:00Z" }),
      invite({ id: "novo", created_at: "2026-03-01T00:00:00Z" }),
      invite({ id: "meio", created_at: "2026-02-01T00:00:00Z" }),
    ]);
    expect(view.count).toBe(3);
    expect(view.headline).toBe("3 convites pendentes");
    expect(view.items.map((i) => i.id)).toEqual(["novo", "meio", "velho"]);
  });
});
