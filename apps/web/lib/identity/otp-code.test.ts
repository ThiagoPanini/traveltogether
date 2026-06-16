import { describe, expect, it } from "vitest";

import { otpDigit, otpFromPaste, otpIsComplete } from "./otp-code";

describe("otpDigit", () => {
  it("mantém só o último dígito digitado, ignorando não-numéricos", () => {
    expect(otpDigit("a7")).toBe("7");
    expect(otpDigit("")).toBe("");
    expect(otpDigit("ab")).toBe("");
  });
});

describe("otpFromPaste", () => {
  it("divide uma colagem de 6 dígitos em células, limpando não-numéricos", () => {
    expect(otpFromPaste("12 34-56")).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("recusa colagem que não traga exatamente 6 dígitos", () => {
    expect(otpFromPaste("123")).toBeNull();
    expect(otpFromPaste("1234567")).toEqual(["1", "2", "3", "4", "5", "6"]);
  });
});

describe("otpIsComplete", () => {
  it("só é completo com 6 células preenchidas", () => {
    expect(otpIsComplete(["1", "2", "3", "4", "5", "6"])).toBe(true);
    expect(otpIsComplete(["1", "2", "3", "4", "5", ""])).toBe(false);
  });
});
