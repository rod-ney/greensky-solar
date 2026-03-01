import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateBody, validateParams } from "./validate";

describe("validateBody", () => {
  const schema = z.object({ name: z.string().min(1), count: z.number() });

  it("returns validated data on success", async () => {
    const req = new Request("http://x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test", count: 5 }),
    });
    const result = await validateBody(req, schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "test", count: 5 });
    }
  });

  it("returns 400 response on validation failure", async () => {
    const req = new Request("http://x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", count: "not-a-number" }),
    });
    const result = await validateBody(req, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const data = await result.response.json();
      expect(data.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: "not json",
    });
    const result = await validateBody(req, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });
});

describe("validateParams", () => {
  const schema = z.object({ id: z.string().min(1) });

  it("returns validated params on success", () => {
    const result = validateParams({ id: "abc123" }, schema);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("abc123");
  });

  it("returns 400 on invalid params", () => {
    const result = validateParams({ id: "" }, schema);
    expect(result.success).toBe(false);
  });
});
