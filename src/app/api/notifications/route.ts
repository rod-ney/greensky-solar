import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth-guard";
import { listNotificationsFromDb } from "@/lib/server/notifications-repository";
import type { NotificationType } from "@/lib/server/notifications-repository";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "20", 10) || 20,
    50
  );
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;
  const type = searchParams.get("type") as NotificationType | null;

  const notifications = await listNotificationsFromDb(auth.userId, {
    limit,
    offset,
    type: type ?? undefined,
  });
  return NextResponse.json(notifications);
}
