import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUserByEmailFromDb = vi.fn();
const createPasswordResetToken = vi.fn();
const sendPasswordResetEmail = vi.fn();

vi.mock("@/lib/server/general-repository", () => ({
  getAuthUserByEmailFromDb: (...args: unknown[]) => getAuthUserByEmailFromDb(...args),
}));

vi.mock("@/lib/server/password-reset", () => ({
  createPasswordResetToken: (...args: unknown[]) => createPasswordResetToken(...args),
}));

vi.mock("@/lib/server/email", () => ({
  sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmail(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
}));

const { POST } = await import("./route");

function jsonRequest(body: object) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a reset email for an existing user", async () => {
    getAuthUserByEmailFromDb.mockResolvedValue({ id: "u1" });
    createPasswordResetToken.mockResolvedValue("token-123");
    sendPasswordResetEmail.mockResolvedValue(undefined);

    const res = await POST(jsonRequest({ email: "user@example.com" }));

    expect(res.status).toBe(200);
    expect(createPasswordResetToken).toHaveBeenCalledWith("u1");
    expect(sendPasswordResetEmail).toHaveBeenCalled();
  });

  it("does not send a reset email for an unknown user", async () => {
    getAuthUserByEmailFromDb.mockResolvedValue(null);

    const res = await POST(jsonRequest({ email: "missing@example.com" }));

    expect(res.status).toBe(200);
    expect(createPasswordResetToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
