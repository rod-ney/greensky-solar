import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth-guard";
import { markNotificationReadInDb } from "@/lib/server/notifications-repository";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const ok = await markNotificationReadInDb(id, auth.userId);
  if (!ok) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
