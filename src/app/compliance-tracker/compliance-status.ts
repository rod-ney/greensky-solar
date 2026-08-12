import type { AdminComplianceTrackerItem } from "@/types/compliance-admin";

export type ComplianceStatusSummary = {
  label: string;
  hint: string;
  tone: "success" | "warning" | "info" | "neutral";
};

export type ComplianceFilter = "all" | "overdue" | "pending" | "resolved";

export function filterComplianceItems(
  items: AdminComplianceTrackerItem[],
  filter: ComplianceFilter,
  today: string
): AdminComplianceTrackerItem[] {
  const resolvedStatuses = new Set(["approved", "waived"]);

  return items.filter((item) => {
    const overdue = !resolvedStatuses.has(item.status) && item.dueDate < today;
    switch (filter) {
      case "overdue":
        return overdue;
      case "pending":
        return !resolvedStatuses.has(item.status) && !overdue;
      case "resolved":
        return resolvedStatuses.has(item.status);
      default:
        return true;
    }
  });
}

export function getComplianceStatusSummary(
  item: { status: string; suppliedBy?: string },
  overdue: boolean
): ComplianceStatusSummary {
  if (item.status === "approved") {
    return {
      label: "Complete",
      hint: "Requirement approved",
      tone: "success",
    };
  }

  if (item.status === "waived") {
    return {
      label: "Waived",
      hint: "Requirement not required",
      tone: "neutral",
    };
  }

  if (item.status === "rejected") {
    return {
      label: "Needs revision",
      hint: "Client should re-upload",
      tone: "warning",
    };
  }

  if (item.status === "submitted") {
    return {
      label: "Ready for review",
      hint: "Client uploaded a file for review",
      tone: "info",
    };
  }

  if (overdue) {
    return {
      label: "Needs action",
      hint: "Overdue and waiting on client",
      tone: "warning",
    };
  }

  if (item.suppliedBy === "admin") {
    return {
      label: "Admin pending",
      hint: "GreenSky still needs to provide this",
      tone: "info",
    };
  }

  return {
    label: "Pending",
    hint: "Waiting for client upload",
    tone: "neutral",
  };
}
