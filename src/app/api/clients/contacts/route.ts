import { NextResponse } from "next/server";
import { listClientContactsFromDb } from "@/lib/server/general-repository";
import { requireAdmin } from "@/lib/server/auth-guard";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const contacts = await listClientContactsFromDb();
    return NextResponse.json(contacts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
