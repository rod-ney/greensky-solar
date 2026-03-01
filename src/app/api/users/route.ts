import { NextResponse } from "next/server";
import { listUsersFromDb } from "@/lib/server/general-repository";
import { requireAdmin } from "@/lib/server/auth-guard";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const users = await listUsersFromDb();
    return NextResponse.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
