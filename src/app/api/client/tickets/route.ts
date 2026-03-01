import { NextResponse } from "next/server";
import { listSupportTicketsByEmail } from "@/lib/server/general-repository";
import { requireClient } from "@/lib/server/auth-guard";

export async function GET() {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const tickets = await listSupportTicketsByEmail(auth.email);
    return NextResponse.json(tickets);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
