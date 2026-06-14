import { describe, expect, it } from "vitest";

import { canDeleteComment, canEditComment, isBlankBody } from "./policy";

describe("canEditComment", () => {
  it("permite só o autor editar", () => {
    expect(canEditComment({ authorId: "u1", userId: "u1", role: "member" })).toBe(true);
    expect(canEditComment({ authorId: "u1", userId: "u2", role: "organizer" })).toBe(false);
  });
});

describe("canDeleteComment", () => {
  it("autor sempre apaga o próprio", () => {
    expect(canDeleteComment({ authorId: "u1", userId: "u1", role: "member" })).toBe(true);
  });

  it("organizador apaga qualquer um", () => {
    expect(canDeleteComment({ authorId: "u1", userId: "u2", role: "organizer" })).toBe(true);
  });

  it("membro não apaga comentário alheio", () => {
    expect(canDeleteComment({ authorId: "u1", userId: "u2", role: "member" })).toBe(false);
  });
});

describe("isBlankBody", () => {
  it("trata corpo só com espaços como vazio", () => {
    expect(isBlankBody("   ")).toBe(true);
    expect(isBlankBody("")).toBe(true);
    expect(isBlankBody(" oi ")).toBe(false);
  });
});
