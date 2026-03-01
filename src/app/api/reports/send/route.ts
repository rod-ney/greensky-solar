import { NextResponse } from "next/server";
import {
  addClientDocumentToDb,
} from "@/lib/server/client-documents-repository";
import { getReportByIdFromDb } from "@/lib/server/general-repository";
import { dbQuery } from "@/lib/server/db";
import { getTodayInManila } from "@/lib/date-utils";
import { requireAdminOrTechnician } from "@/lib/server/auth-guard";
import type { DocumentType } from "@/types/client";

const reportTypeToDocType: Record<string, DocumentType> = {
  service: "report",
  quotation: "report",
  revenue: "report",
};

export async function POST(request: Request) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await request.json()) as { reportId?: string; recipientId?: string };
    const reportId = body.reportId?.trim();
    const recipientId = body.recipientId?.trim();

    if (!reportId || !recipientId) {
      return NextResponse.json(
        { error: "reportId and recipientId are required." },
        { status: 400 }
      );
    }

    const userCheck = await dbQuery<{ id: string }>(
      "SELECT id FROM users WHERE id = $1 LIMIT 1",
      [recipientId]
    );
    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Recipient must be a registered user to receive documents." },
        { status: 400 }
      );
    }

    const report = await getReportByIdFromDb(reportId);
    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const docType = reportTypeToDocType[report.type] ?? "report";
    const today = getTodayInManila();

    const created = await addClientDocumentToDb(
      {
        title: report.title,
        type: docType,
        fileSize: "—",
        uploadedAt: today,
        projectName: report.projectName ?? undefined,
        status: "active",
        approvalStatus: "pending",
      },
      recipientId,
      reportId
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
