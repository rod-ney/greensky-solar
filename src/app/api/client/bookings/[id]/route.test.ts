import { beforeEach, describe, expect, it, vi } from "vitest";

const updateClientBookingInDb = vi.fn();
const getBookingStatusFromDb = vi.fn();
const bookingBelongsToUser = vi.fn();
const getBookingUserId = vi.fn();
const createNotification = vi.fn();
const getAdminUserIds = vi.fn();

vi.mock("@/lib/server/client-bookings-repository", () => ({
  updateClientBookingInDb: (...args: unknown[]) => updateClientBookingInDb(...args),
  getBookingStatusFromDb: (...args: unknown[]) => getBookingStatusFromDb(...args),
  bookingBelongsToUser: (...args: unknown[]) => bookingBelongsToUser(...args),
  getBookingUserId: (...args: unknown[]) => getBookingUserId(...args),
  deleteClientBookingInDb: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: (...args: unknown[]) => createNotification(...args),
  getAdminUserIds: (...args: unknown[]) => getAdminUserIds(...args),
}));

vi.mock("@/lib/server/auth-guard", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ userId: "admin-1", role: "admin" }),
  requireAuth: vi.fn().mockResolvedValue({ userId: "u1", role: "client" }),
}));

const { PATCH } = await import("./route");

function jsonRequest(body: object) {
  return new Request("http://localhost/api/client/bookings/b1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/client/bookings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingBelongsToUser.mockResolvedValue(true);
    getBookingStatusFromDb.mockResolvedValue("pending");
    updateClientBookingInDb.mockResolvedValue({ id: "b1", referenceNo: "BK-0001", status: "confirmed" });
    getBookingUserId.mockResolvedValue("u1");
    getAdminUserIds.mockResolvedValue(["admin-1"]);
    createNotification.mockResolvedValue(undefined);
  });

  it("notifies the client and admins when a booking is confirmed", async () => {
    const res = await PATCH(
      jsonRequest({ status: "confirmed" }),
      { params: Promise.resolve({ id: "b1" }) } as any
    );

    expect(res.status).toBe(200);
    expect(createNotification).toHaveBeenCalled();
  });
});
