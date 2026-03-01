import { describe, it, expect, vi, beforeEach } from "vitest";

const getAuthUserByEmailFromDb = vi.fn();
const verifyPassword = vi.fn();

vi.mock("@/lib/server/general-repository", () => ({
  getAuthUserByEmailFromDb: (...args: unknown[]) => getAuthUserByEmailFromDb(...args),
}));

vi.mock("@/lib/server/profile-repository", () => ({
  recordLoginActivityInDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
}));

vi.mock("@/lib/auth", () => ({
  verifyPassword: (...args: unknown[]) => verifyPassword(...args),
}));

vi.mock("@/lib/logger", () => ({
  createRequestLogger: () => ({ error: vi.fn() }),
  getRequestId: () => "test-req-id",
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { POST } = await import("./route");

function jsonRequest(body: object) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing email", async () => {
    const res = await POST(jsonRequest({ password: "secret123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(jsonRequest({ email: "not-an-email", password: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing password", async () => {
    const res = await POST(jsonRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 for invalid credentials", async () => {
    getAuthUserByEmailFromDb.mockResolvedValue(null);
    const res = await POST(jsonRequest({ email: "a@b.com", password: "wrong" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toContain("Invalid");
  });

  it("returns 401 when password does not match", async () => {
    getAuthUserByEmailFromDb.mockResolvedValue({
      id: "u1",
      name: "Test",
      email: "a@b.com",
      password_hash: "hash",
      role: "client",
    } as never);
    verifyPassword.mockReturnValue(false);
    const res = await POST(jsonRequest({ email: "a@b.com", password: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 and sets cookies on valid login", async () => {
    getAuthUserByEmailFromDb.mockResolvedValue({
      id: "u1",
      name: "Test",
      email: "a@b.com",
      password_hash: "hash",
      role: "client",
    } as never);
    verifyPassword.mockReturnValue(true);
    const res = await POST(jsonRequest({ email: "a@b.com", password: "correct" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("gs_auth");
  });
});
