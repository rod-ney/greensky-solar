import { NextResponse } from "next/server";
import {
  deleteSupportTicketFromDb,
  updateSupportTicketInDb,
} from "@/lib/server/general-repository";
import { requireAdminOrTechnician } from "@/lib/server/auth-guard";
import type { SupportTicket } from "@/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const deleted = await deleteSupportTicketFromDb(id);
    if (!deleted) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: SupportTicket["status"] };
    if (!body.status || !["open", "in_progress", "resolved"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status. Use open, in_progress, or resolved." },
        { status: 400 }
      );
    }
    const updated = await updateSupportTicketInDb(id, { status: body.status });
    if (!updated) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
