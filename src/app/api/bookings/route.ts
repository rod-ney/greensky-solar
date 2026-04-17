import { NextResponse } from "next/server";
import { listClientBookingsFromDb } from "@/lib/server/client-bookings-repository";
import { requireAdminOrTechnician } from "@/lib/server/auth-guard";

/**
 * Admin: list all bookings.
 * Technician: list only bookings assigned to the technician.
 */
export async function GET() {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  try {
    const bookings = await listClientBookingsFromDb(null);
    if (auth.role === "technician") return NextResponse.json(bookings);
    return NextResponse.json(bookings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
