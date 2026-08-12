import { dbQuery } from "@/lib/server/db";
import { toIsoDateManila } from "@/lib/date-utils";
import { updateDocumentApprovalStatusInDb } from "@/lib/server/client-documents-repository";
import type { ComplianceItemStatus, Document } from "@/types/client";
import type { AdminComplianceTrackerItem } from "@/types/compliance-admin";
import { randomUUID } from "crypto";

type ComplianceRow = {
  item_id: string;
  project_id: string;
  project_name: string;
  project_location: string | null;
  user_id: string;
  client_name: string;
  client_email: string;
  requirement_key: string;
  title: string;
  description: string;
  due_date: string | Date;
  supplied_by: "client" | "admin";
  status: ComplianceItemStatus;
  document_id: string | null;
  file_url: string | null;
  doc_approval_status: string | null;
};

function mapRow(r: ComplianceRow): AdminComplianceTrackerItem {
  return {
    id: r.item_id,
    projectId: r.project_id,
    projectName: r.project_name,
    location: r.project_location ?? undefined,
    userId: r.user_id,
    clientName: r.client_name,
    clientEmail: r.client_email,
    requirementKey: r.requirement_key,
    title: r.title,
    description: r.description,
    dueDate: toIsoDateManila(r.due_date),
    suppliedBy: r.supplied_by,
    status: r.status,
    documentId: r.document_id ?? undefined,
    fileUrl: r.file_url ?? undefined,
    documentApprovalStatus: r.doc_approval_status ?? undefined,
  };
}

/** Client user IDs that have at least one completed site inspection booking and own a project. */
export async function listUserIdsEligibleForComplianceTracker(): Promise<string[]> {
  const result = await dbQuery<{ user_id: string }>(
    `
      SELECT DISTINCT p.user_id
      FROM projects p
      WHERE p.user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.user_id = p.user_id
            AND b.service_type = 'site_inspection'
            AND b.status = 'completed'
        )
    `
  );
  return result.rows.map((r) => r.user_id);
}

/**
 * Compliance rows for projects whose client completed site inspection.
 */
export async function listAdminComplianceTrackerItems(): Promise<AdminComplianceTrackerItem[]> {
  const result = await dbQuery<ComplianceRow>(
    `
      SELECT
        c.id AS item_id,
        c.project_id,
        p.name AS project_name,
        p.location AS project_location,
        p.user_id,
        u.name AS client_name,
        u.email AS client_email,
        c.requirement_key,
        c.title,
        c.description,
        c.due_date,
        c.supplied_by,
        c.status,
        c.document_id,
        d.file_url,
        d.approval_status::text AS doc_approval_status
      FROM compliance_timeline_items c
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN users u ON u.id = p.user_id
      LEFT JOIN documents d ON d.id = c.document_id
      WHERE p.user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.user_id = p.user_id
            AND b.service_type = 'site_inspection'
            AND b.status = 'completed'
        )
      ORDER BY p.name ASC, c.sort_order ASC, c.due_date ASC
    `
  );
  return result.rows.map(mapRow);
}

export type AdminComplianceReviewResult =
  | { ok: true; clientUserId: string; itemTitle: string }
  | { ok: false; error: string };

/**
 * Approve or reject a client-uploaded compliance document (admin only).
 * Requires item status submitted, linked document, eligible project (site inspection completed).
 */
export async function adminReviewComplianceItemInDb(
  itemId: string,
  decision: "approved" | "rejected"
): Promise<AdminComplianceReviewResult> {
  const sel = await dbQuery<{
    document_id: string;
    client_user_id: string;
    title: string;
  }>(
    `
      SELECT c.document_id, p.user_id AS client_user_id, c.title
      FROM compliance_timeline_items c
      INNER JOIN projects p ON p.id = c.project_id
      WHERE c.id = $1
        AND c.document_id IS NOT NULL
        AND c.status = 'submitted'
        AND c.supplied_by = 'client'
        AND p.user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.user_id = p.user_id
            AND b.service_type = 'site_inspection'
            AND b.status = 'completed'
        )
      LIMIT 1
    `,
    [itemId]
  );
  const row = sel.rows[0];
  if (!row?.document_id) {
    return { ok: false, error: "Item not found or not awaiting review." };
  }

  const docApproval = decision === "approved" ? "approved" : "rejected";
  const itemStatus: ComplianceItemStatus = decision === "approved" ? "approved" : "rejected";

  const docUpdated = await updateDocumentApprovalStatusInDb(row.document_id, docApproval);
  if (!docUpdated) {
    return { ok: false, error: "Could not update document approval." };
  }

  const itemUp = await dbQuery(
    `
      UPDATE compliance_timeline_items
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [itemId, itemStatus]
  );
  if ((itemUp.rowCount ?? 0) === 0) {
    return { ok: false, error: "Could not update compliance status." };
  }

  return {
    ok: true,
    clientUserId: row.client_user_id,
    itemTitle: row.title,
  };
}

/**
 * Get a single compliance item by ID (admin view).
 */
export async function getComplianceItemById(
  itemId: string
): Promise<AdminComplianceTrackerItem | null> {
  const result = await dbQuery<ComplianceRow>(
    `
      SELECT
        c.id AS item_id,
        c.project_id,
        p.name AS project_name,
        p.user_id,
        u.name AS client_name,
        u.email AS client_email,
        c.requirement_key,
        c.title,
        c.description,
        c.due_date,
        c.supplied_by,
        c.status,
        c.document_id,
        d.file_url,
        d.approval_status::text AS doc_approval_status
      FROM compliance_timeline_items c
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN users u ON u.id = p.user_id
      LEFT JOIN documents d ON d.id = c.document_id
      WHERE c.id = $1
        AND p.user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.user_id = p.user_id
            AND b.service_type = 'site_inspection'
            AND b.status = 'completed'
        )
      LIMIT 1
    `,
    [itemId]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

/**
 * Add a document for admin uploads (solar diagrams, etc.)
 */
export async function addAdminDocumentToDb(
  doc: Omit<Document, "id">,
  adminUserId: string
): Promise<Document> {
  const nextId = `doc-${randomUUID()}`;

  type DocumentRow = {
    id: string;
    title: string;
    type: Document["type"];
    file_size: string;
    uploaded_at: string | Date;
    project_name: string | null;
    status: Document["status"];
    approval_status: Document["approvalStatus"] | null;
    report_id: string | null;
    file_url: string | null;
  };

  await dbQuery(
    `
      INSERT INTO documents (id, title, type, file_size, uploaded_at, project_name, status, approval_status, user_id, file_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      nextId,
      doc.title,
      doc.type,
      doc.fileSize,
      doc.uploadedAt,
      doc.projectName ?? null,
      doc.status,
      doc.approvalStatus ?? null,
      adminUserId,
      doc.fileUrl ?? null,
    ]
  );

  return {
    id: nextId,
    title: doc.title,
    type: doc.type,
    fileSize: doc.fileSize,
    uploadedAt: doc.uploadedAt,
    projectName: doc.projectName,
    status: doc.status,
    approvalStatus: doc.approvalStatus,
    fileUrl: doc.fileUrl,
  };
}

/**
 * Update a compliance item document (for admin uploads to admin-queue items).
 * No user_id check since these are admin-supplied items.
 */
export async function updateAdminComplianceItemDocument(
  itemId: string,
  documentId: string | null
): Promise<boolean> {
  const result = await dbQuery(
    `
      UPDATE compliance_timeline_items
      SET document_id = $2, status = $3, updated_at = NOW()
      WHERE id = $1 AND supplied_by = 'admin'
      RETURNING id
    `,
    [itemId, documentId, documentId ? "pending" : "pending"]
  );
  return (result.rowCount ?? 0) > 0;
}

