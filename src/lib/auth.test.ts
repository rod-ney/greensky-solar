import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./auth";

describe("auth", () => {
  it("hashes and verifies password correctly", () => {
    const password = "secret123";
    const hash = hashPassword(password);
    expect(hash).toContain(":");
    expect(hash.length).toBeGreaterThan(32);
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it("rejects wrong password", () => {
    const hash = hashPassword("correct");
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces different hashes for same password (salt)", () => {
    const hash1 = hashPassword("same");
    const hash2 = hashPassword("same");
    expect(hash1).not.toBe(hash2);
    expect(verifyPassword("same", hash1)).toBe(true);
    expect(verifyPassword("same", hash2)).toBe(true);
  });

  it("rejects invalid hash format", () => {
    expect(verifyPassword("x", "no-colon")).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
  });
});
