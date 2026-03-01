import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows request when under limit", async () => {
    const result = await checkRateLimit("test-key-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("returns allowed and remaining", async () => {
    const key = `unique-${Date.now()}-${Math.random()}`;
    const r1 = await checkRateLimit(key);
    expect(r1.allowed).toBe(true);
    const r2 = await checkRateLimit(key);
    expect(r2.remaining).toBeLessThanOrEqual(r1.remaining);
  });
});
