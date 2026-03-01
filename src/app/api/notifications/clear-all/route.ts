import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth-guard";
import { clearAllNotificationsInDb } from "@/lib/server/notifications-repository";

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const count = await clearAllNotificationsInDb(auth.userId);
  return NextResponse.json({ cleared: count });
}
