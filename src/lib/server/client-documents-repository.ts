import { dbQuery } from "@/lib/server/db";
import { toIsoDateManila } from "@/lib/date-utils";
import type { Document } from "@/types/client";

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
  linked_report_type: string | null;
};

const DOCUMENT_SELECT = `
  SELECT d.id, d.title, d.type, d.file_size, d.uploaded_at, d.project_name, d.status, d.approval_status, d.report_id,
         r.type AS linked_report_type
  FROM documents d
  LEFT JOIN reports r ON r.id = d.report_id
`;

function mapLinkedReportType(value: string | null): Document["linkedReportType"] | undefined {
  if (value === "service" || value === "quotation" || value === "revenue") {
    return value;
  }
  return undefined;
}

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    fileSize: row.file_size,
    uploadedAt: toIsoDateManila(row.uploaded_at),
    projectName: row.project_name ?? undefined,
    status: row.status,
    approvalStatus: row.approval_status ?? undefined,
    reportId: row.report_id ?? undefined,
    linkedReportType: mapLinkedReportType(row.linked_report_type),
  };
}

export async function listClientDocumentsFromDb(userId?: string): Promise<Document[]> {
  const result = userId
    ? await dbQuery<DocumentRow>(
        `
          ${DOCUMENT_SELECT}
          WHERE d.user_id = $1
          ORDER BY d.uploaded_at DESC
        `,
        [userId]
      )
    : await dbQuery<DocumentRow>(
        `
          ${DOCUMENT_SELECT}
          WHERE d.user_id IS NULL
          ORDER BY d.uploaded_at DESC
        `
      );
  return result.rows.map(mapDocument);
}

export async function addClientDocumentToDb(
  doc: Omit<Document, "id">,
  userId?: string,
  reportId?: string
): Promise<Document> {
  const nextId = `doc-${crypto.randomUUID()}`;

  await dbQuery(
    `
      INSERT INTO documents (id, title, type, file_size, uploaded_at, project_name, status, approval_status, user_id, report_id)
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
      userId ?? null,
      reportId ?? null,
    ]
  );

  const result = await dbQuery<DocumentRow>(
    `
      ${DOCUMENT_SELECT}
      WHERE d.id = $1
      LIMIT 1
    `,
    [nextId]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Document was created but could not be read back.");
  }
  return mapDocument(row);
}

export async function documentBelongsToUser(
  documentId: string,
  userId: string
): Promise<boolean> {
  const result = await dbQuery<{ n: number }>(
    `SELECT 1 AS n FROM documents WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [documentId, userId]
  );
  return result.rows.length > 0;
}

export async function updateDocumentApprovalStatusInDb(
  id: string,
  approvalStatus: Document["approvalStatus"]
): Promise<Document | null> {
  const updated = await dbQuery(
    `UPDATE documents SET approval_status = $2 WHERE id = $1`,
    [id, approvalStatus]
  );
  if ((updated.rowCount ?? 0) === 0) {
    return null;
  }
  const result = await dbQuery<DocumentRow>(
    `
      ${DOCUMENT_SELECT}
      WHERE d.id = $1
      LIMIT 1
    `,
    [id]
  );
  const row = result.rows[0];
  return row ? mapDocument(row) : null;
}

export async function deleteClientDocumentFromDb(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await dbQuery(
    "DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
