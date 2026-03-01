import { NextResponse } from "next/server";
import {
  updateReportStatusInDb,
  deleteReportFromDb,
} from "@/lib/server/general-repository";
import { requireAdminOrTechnician } from "@/lib/server/auth-guard";
import type { Report } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: Report["status"] };
    if (!body.status) {
      return NextResponse.json({ error: "status is required." }, { status: 400 });
    }
    const updated = await updateReportStatusInDb(id, body.status);
    if (!updated) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const deleted = await deleteReportFromDb(id);
    if (!deleted) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
