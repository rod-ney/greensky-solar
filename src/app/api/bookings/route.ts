import { NextResponse } from "next/server";
import { listClientBookingsFromDb } from "@/lib/server/client-bookings-repository";
import { requireAdmin } from "@/lib/server/auth-guard";

/**
 * Admin-only: list all bookings.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    const bookings = await listClientBookingsFromDb(null);
    return NextResponse.json(bookings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
