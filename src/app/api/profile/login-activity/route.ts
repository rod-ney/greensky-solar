import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth-guard";
import { listLoginActivityFromDb } from "@/lib/server/profile-repository";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "20", 10) || 20,
    50
  );

  const activity = await listLoginActivityFromDb(auth.userId, limit);
  return NextResponse.json(activity);
}
