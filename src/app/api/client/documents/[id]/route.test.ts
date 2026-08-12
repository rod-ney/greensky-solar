import { beforeEach, describe, expect, it, vi } from "vitest";

const updateDocumentApprovalStatusInDb = vi.fn();
const documentBelongsToUser = vi.fn();
const deleteClientDocumentFromDb = vi.fn();
const getReportByIdFromDb = vi.fn();
const updateReportInDb = vi.fn();
const listUsersFromDb = vi.fn();
const createNotification = vi.fn();
const getAdminUserIds = vi.fn();

vi.mock("@/lib/server/client-documents-repository", () => ({
  updateDocumentApprovalStatusInDb: (...args: unknown[]) => updateDocumentApprovalStatusInDb(...args),
  documentBelongsToUser: (...args: unknown[]) => documentBelongsToUser(...args),
  deleteClientDocumentFromDb: (...args: unknown[]) => deleteClientDocumentFromDb(...args),
}));

vi.mock("@/lib/server/general-repository", () => ({
  getReportByIdFromDb: (...args: unknown[]) => getReportByIdFromDb(...args),
  updateReportInDb: (...args: unknown[]) => updateReportInDb(...args),
  listUsersFromDb: (...args: unknown[]) => listUsersFromDb(...args),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: (...args: unknown[]) => createNotification(...args),
  getAdminUserIds: (...args: unknown[]) => getAdminUserIds(...args),
}));

vi.mock("@/lib/server/auth-guard", () => ({
  requireClient: vi.fn().mockResolvedValue({ userId: "u1", role: "client" }),
}));

const { PATCH } = await import("./route");

function jsonRequest(body: object) {
  return new Request("http://localhost/api/client/documents/doc-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/client/documents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentBelongsToUser.mockResolvedValue(true);
    updateDocumentApprovalStatusInDb.mockResolvedValue({
      id: "doc-1",
      linkedReportType: "quotation",
      reportId: "rep-1",
    });
    getReportByIdFromDb.mockResolvedValue({
      id: "rep-1",
      type: "quotation",
      description: JSON.stringify({ clientName: "Jane" }),
      submittedBy: "tech-1",
    });
    updateReportInDb.mockResolvedValue(undefined);
    listUsersFromDb.mockResolvedValue([{ id: "user-1", email: "tech@example.com", name: "Tech" }]);
    getAdminUserIds.mockResolvedValue(["admin-1"]);
    createNotification.mockResolvedValue(undefined);
  });

  it("updates the linked report description with the client rejection comment", async () => {
    const res = await PATCH(
      jsonRequest({ approvalStatus: "rejected", rejectionComment: "Needs revision" }),
      { params: Promise.resolve({ id: "doc-1" }) } as any
    );

    expect(res.status).toBe(200);
    expect(updateReportInDb).toHaveBeenCalled();
    expect(createNotification).toHaveBeenCalled();
  });
});
