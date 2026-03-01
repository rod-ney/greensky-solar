import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth-guard";
import { markAllNotificationsReadInDb } from "@/lib/server/notifications-repository";

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const count = await markAllNotificationsReadInDb(auth.userId);
  return NextResponse.json({ marked: count });
}
