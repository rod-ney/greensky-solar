import { NextResponse } from "next/server";
import { listInventoryFromDb } from "@/lib/server/general-repository";
import { requireAdminOrTechnician } from "@/lib/server/auth-guard";

export async function GET() {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const items = await listInventoryFromDb();
    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
