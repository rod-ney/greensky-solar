import { NextResponse } from "next/server";
import {
  listSupportTicketsFromDb,
  createSupportTicketInDb,
} from "@/lib/server/general-repository";
import { requireAdmin, requireAuth } from "@/lib/server/auth-guard";
import { executeWithIdempotency } from "@/lib/server/idempotency";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.has("offset") ? Number(searchParams.get("offset")) : undefined;
    const result = await listSupportTicketsFromDb({ limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  return executeWithIdempotency(request, async () => {
    const body = (await request.json()) as {
      projectId?: string;
      clientName?: string;
      clientEmail?: string;
      subject?: string;
      description?: string;
    };
    if (!body.clientName?.trim() || !body.clientEmail?.trim() || !body.subject?.trim()) {
      return NextResponse.json(
        { error: "clientName, clientEmail, and subject are required." },
        { status: 400 }
      );
    }
    const created = await createSupportTicketInDb({
      projectId: body.projectId,
      clientName: body.clientName.trim(),
      clientEmail: body.clientEmail.trim(),
      subject: body.subject.trim(),
      description: (body.description ?? "").trim(),
    });
    return NextResponse.json(created, { status: 201 });
  });
}
