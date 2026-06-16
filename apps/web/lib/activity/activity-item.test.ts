import type { ActivityItemPublic } from "@traveltogether/types";
import { describe, expect, it } from "vitest";

import { activityHref, activityKindLabel } from "./activity-item";

function item(over: Partial<ActivityItemPublic>): ActivityItemPublic {
  return {
    id: "a1",
    kind: "comment",
    trip_id: "t1",
    trip_name: "Eurotrip",
    actor_name: "Bob",
    body: "oi",
    occurred_at: "2026-07-01T10:00:00Z",
    ...over,
  };
}

describe("activityKindLabel", () => {
  it("rotula entrada de Membro", () => {
    expect(activityKindLabel("member_joined")).toBe("entrou");
  });

  it("rotula Comentário e Pesquisa de Passagem", () => {
    expect(activityKindLabel("comment")).toBe("comentou");
    expect(activityKindLabel("fare_registered")).toBe("pesquisa");
  });
});

describe("activityHref", () => {
  it("aponta o item para a Viagem de contexto", () => {
    expect(activityHref(item({ trip_id: "t9" }))).toBe("/trips/t9");
  });
});
