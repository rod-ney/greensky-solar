import { NextResponse } from "next/server";
import { requireClient } from "@/lib/server/auth-guard";
import { documentBelongsToUser } from "@/lib/server/client-documents-repository";
import { dbQuery } from "@/lib/server/db";
import type { Report } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReportRow = {
  id: string;
  title: string;
  type: Report["type"];
  status: Report["status"];
  submitted_by: string;
  submitted_at: string | Date;
  project_id: string | null;
  project_name: string | null;
  amount: number | null;
  description: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const belongs = await documentBelongsToUser(id, auth.userId);
    if (!belongs) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }
    const result = await dbQuery<ReportRow>(
      `
        SELECT r.id, r.title, r.type, r.status, r.submitted_by, r.submitted_at,
               r.project_id, r.project_name, r.amount, r.description
        FROM documents d
        JOIN reports r ON r.id = d.report_id
        WHERE d.id = $1 AND d.user_id = $2
        LIMIT 1
      `,
      [id, auth.userId]
    );
    const row = result.rows[0];
    if (!row) {
      const fallback = await dbQuery<ReportRow>(
        `
          SELECT r.id, r.title, r.type, r.status, r.submitted_by, r.submitted_at,
                 r.project_id, r.project_name, r.amount, r.description
          FROM documents d
          JOIN reports r
            ON r.title = d.title
           AND (d.project_name IS NULL OR r.project_name = d.project_name)
          WHERE d.id = $1
            AND d.user_id = $2
            AND r.type IN ('quotation', 'service', 'revenue')
          ORDER BY r.submitted_at DESC
          LIMIT 1
        `,
        [id, auth.userId]
      );
      const fallbackRow = fallback.rows[0];
      if (!fallbackRow) {
        return NextResponse.json({ error: "Linked report not found." }, { status: 404 });
      }
      const fallbackReport: Report = {
        id: fallbackRow.id,
        title: fallbackRow.title,
        type: fallbackRow.type,
        status: fallbackRow.status,
        submittedBy: fallbackRow.submitted_by,
        submittedAt: new Date(fallbackRow.submitted_at).toISOString().slice(0, 10),
        projectId: fallbackRow.project_id ?? undefined,
        projectName: fallbackRow.project_name ?? undefined,
        amount: fallbackRow.amount ?? undefined,
        description: fallbackRow.description,
        clientApprovalStatus: null,
      };
      return NextResponse.json(fallbackReport);
    }
    const report: Report = {
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      submittedBy: row.submitted_by,
      submittedAt: new Date(row.submitted_at).toISOString().slice(0, 10),
      projectId: row.project_id ?? undefined,
      projectName: row.project_name ?? undefined,
      amount: row.amount ?? undefined,
      description: row.description,
      clientApprovalStatus: null,
    };
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
