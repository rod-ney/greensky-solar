import type { ComplianceItemStatus } from "@/types/client";

export type AdminComplianceTrackerItem = {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  requirementKey: string;
  title: string;
  description: string;
  dueDate: string;
  suppliedBy: "client" | "admin";
  status: ComplianceItemStatus;
  documentId?: string;
  fileUrl?: string;
  documentApprovalStatus?: string;
};
