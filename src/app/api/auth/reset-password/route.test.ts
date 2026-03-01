import { describe, it, expect, vi, beforeEach } from "vitest";

const consumePasswordResetToken = vi.fn();
const updatePasswordInDb = vi.fn();

vi.mock("@/lib/server/password-reset", () => ({
  consumePasswordResetToken: (...args: unknown[]) => consumePasswordResetToken(...args),
  updatePasswordInDb: (...args: unknown[]) => updatePasswordInDb(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
}));

const { POST } = await import("./route");

function jsonRequest(body: object) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing token", async () => {
    const res = await POST(jsonRequest({ password: "newpass123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for short password", async () => {
    const res = await POST(jsonRequest({ token: "abc", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid token", async () => {
    consumePasswordResetToken.mockResolvedValue(null);
    const res = await POST(jsonRequest({ token: "invalid", password: "newpass123" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid");
  });

  it("returns 200 and updates password on valid token", async () => {
    consumePasswordResetToken.mockResolvedValue({ userId: "u1" });
    updatePasswordInDb.mockResolvedValue(undefined);
    const res = await POST(jsonRequest({ token: "valid-token", password: "newpass123" }));
    expect(res.status).toBe(200);
    expect(updatePasswordInDb).toHaveBeenCalledWith("u1", "newpass123");
  });
});
