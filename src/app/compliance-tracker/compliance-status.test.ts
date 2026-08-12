import { describe, expect, it } from "vitest";
import type { AdminComplianceTrackerItem } from "@/types/compliance-admin";
import { filterComplianceItems, getComplianceStatusSummary } from "./compliance-status";

function makeItem(overrides: Partial<AdminComplianceTrackerItem> = {}): AdminComplianceTrackerItem {
  return {
    id: "item-1",
    projectId: "project-1",
    projectName: "Project",
    userId: "user-1",
    clientName: "Client",
    clientEmail: "client@example.com",
    requirementKey: "permit",
    title: "Permit",
    description: "Permit description",
    dueDate: "2026-08-10",
    suppliedBy: "client",
    status: "pending",
    ...overrides,
  };
}

describe("filterComplianceItems", () => {
  it("returns overdue items for the overdue filter", () => {
    const items = [
      makeItem({ id: "a", status: "pending", dueDate: "2026-08-01" }),
      makeItem({ id: "b", status: "pending", dueDate: "2026-08-20" }),
      makeItem({ id: "c", status: "approved", dueDate: "2026-08-05" }),
    ];

    expect(filterComplianceItems(items, "overdue", "2026-08-10").map((item) => item.id)).toEqual(["a"]);
  });

  it("returns resolved items for the resolved filter", () => {
    const items = [
      makeItem({ id: "a", status: "approved", dueDate: "2026-08-01" }),
      makeItem({ id: "b", status: "waived", dueDate: "2026-08-02" }),
      makeItem({ id: "c", status: "pending", dueDate: "2026-08-03" }),
    ];

    expect(filterComplianceItems(items, "resolved", "2026-08-10").map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("getComplianceStatusSummary", () => {
  it("returns a completed summary for approved items", () => {
    const summary = getComplianceStatusSummary(makeItem({ status: "approved" }), false);
    expect(summary.label).toBe("Complete");
    expect(summary.hint).toBe("Requirement approved");
  });

  it("returns an action summary for overdue pending items", () => {
    const summary = getComplianceStatusSummary(makeItem({ status: "pending" }), true);
    expect(summary.label).toBe("Needs action");
    expect(summary.hint).toBe("Overdue and waiting on client");
  });

  it("returns a review summary for submitted items", () => {
    const summary = getComplianceStatusSummary(makeItem({ status: "submitted" }), false);
    expect(summary.label).toBe("Ready for review");
    expect(summary.hint).toBe("Client uploaded a file for review");
  });
});
