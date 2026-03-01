import { NextResponse } from "next/server";
import { createReportInDb, listReportsFromDb } from "@/lib/server/general-repository";
import { requireAdminOrTechnician } from "@/lib/server/auth-guard";
import { createNotification, getAdminUserIds } from "@/lib/notifications";
import { getTodayInManila } from "@/lib/date-utils";
import type { Report } from "@/types";

export async function GET() {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const reports = await listReportsFromDb();
    return NextResponse.json(reports);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await request.json()) as Partial<Report>;
    if (!body.title || !body.type || !body.submittedBy || !body.description) {
      return NextResponse.json(
        { error: "title, type, submittedBy, and description are required." },
        { status: 400 }
      );
    }
    const created = await createReportInDb({
      title: body.title,
      type: body.type,
      status: body.status,
      submittedBy: body.submittedBy,
      submittedAt: body.submittedAt ?? getTodayInManila(),
      projectId: body.projectId,
      projectName: body.projectName,
      amount: body.amount,
      description: body.description,
    });
    const adminIds = await getAdminUserIds();
    for (const adminId of adminIds) {
      await createNotification(
        adminId,
        "report_submitted",
        "Report submitted",
        `${body.title} by ${body.submittedBy}`,
        "/reports"
      );
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
