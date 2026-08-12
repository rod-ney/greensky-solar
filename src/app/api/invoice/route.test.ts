import { beforeEach, describe, expect, it, vi } from "vitest";

const createPaymentInDb = vi.fn();
const getNextInvoiceNumber = vi.fn();
const addClientDocumentToDb = vi.fn();
const requireAdmin = vi.fn();
const executeWithIdempotency = vi.fn();
const getBookingByReferenceOrId = vi.fn();

vi.mock("@/lib/server/general-repository", () => ({
  createPaymentInDb: (...args: unknown[]) => createPaymentInDb(...args),
  getNextInvoiceNumber: (...args: unknown[]) => getNextInvoiceNumber(...args),
  listInvoicesFromDb: vi.fn(),
}));

vi.mock("@/lib/server/client-documents-repository", () => ({
  addClientDocumentToDb: (...args: unknown[]) => addClientDocumentToDb(...args),
}));

vi.mock("@/lib/server/auth-guard", () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock("@/lib/server/idempotency", () => ({
  executeWithIdempotency: (...args: unknown[]) => executeWithIdempotency(...args),
}));

vi.mock("@/lib/server/client-bookings-repository", () => ({
  getBookingByReferenceOrId: (...args: unknown[]) => getBookingByReferenceOrId(...args),
  updateClientBookingInDb: vi.fn(),
}));

const { POST } = await import("./route");

function jsonRequest(body: object) {
  return new Request("http://localhost/api/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: "admin-1", role: "admin" });
    executeWithIdempotency.mockImplementation((_request: Request, handler: (request: Request) => Promise<Response>) =>
      handler(_request)
    );
    getNextInvoiceNumber.mockResolvedValue("INV-0001");
    createPaymentInDb.mockResolvedValue({ id: "pay-1" });
    getBookingByReferenceOrId.mockResolvedValue({
      id: "book-1",
      referenceNo: "BK-0001",
      userId: "u1",
      serviceType: "solar_panel_installation",
      amount: 1500,
      status: "pending",
    });
  });

  it("links a generated invoice to a booking reference when bookingId is provided", async () => {
    const res = await POST(jsonRequest({ bookingId: "book-1" }));

    expect(res.status).toBe(201);
    expect(createPaymentInDb).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingRef: "BK-0001",
        userId: "u1",
        amount: 1500,
        serviceType: "Solar Panel Installation",
      })
    );
  });
});
