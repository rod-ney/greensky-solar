import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth-guard";
import { getUnreadCountFromDb } from "@/lib/server/notifications-repository";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const count = await getUnreadCountFromDb(auth.userId);
  return NextResponse.json({ count });
}
