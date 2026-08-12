import { beforeEach, describe, expect, it, vi } from "vitest";

const getPaymentById = vi.fn();
const updatePaymentInDb = vi.fn();
const deletePaymentInDb = vi.fn();
const requireAdmin = vi.fn();
const validateBody = vi.fn();

vi.mock("@/lib/server/general-repository", () => ({
  getPaymentById: (...args: unknown[]) => getPaymentById(...args),
  updatePaymentInDb: (...args: unknown[]) => updatePaymentInDb(...args),
  deletePaymentInDb: (...args: unknown[]) => deletePaymentInDb(...args),
}));

vi.mock("@/lib/server/auth-guard", () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock("@/lib/validations", () => ({
  updateInvoiceSchema: {
    safeParse: (value: unknown) => ({ success: true, data: value }),
  },
}));

vi.mock("@/lib/validations/validate", () => ({
  validateBody: (...args: unknown[]) => validateBody(...args),
}));

const { PATCH } = await import("./route");

function jsonRequest(body: object) {
  return new Request("http://localhost/api/invoice/inv-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/invoice/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: "admin-1", role: "admin" });
    validateBody.mockResolvedValue({ success: true, data: { status: "paid" } });
    getPaymentById.mockResolvedValue({ id: "inv-1", referenceNo: "INV-0001", bookingRef: "BK-0001" });
    updatePaymentInDb.mockResolvedValue({ id: "inv-1", referenceNo: "INV-0001", bookingRef: "BK-0001", status: "paid" });
  });

  it("updates invoice status when provided", async () => {
    const res = await PATCH(jsonRequest({ status: "paid" }), { params: Promise.resolve({ id: "inv-1" }) } as any);

    expect(res.status).toBe(200);
    expect(updatePaymentInDb).toHaveBeenCalled();
  });
});
