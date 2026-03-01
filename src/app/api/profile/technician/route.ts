import { NextResponse } from "next/server";
import { getTechnicianByUserId } from "@/lib/server/general-repository";
import { requireAdminOrTechnician } from "@/lib/server/auth-guard";

/**
 * Returns the current user's technician profile when logged in as a technician.
 * Used by technician pages to reliably identify the logged-in technician.
 */
export async function GET() {
  const auth = await requireAdminOrTechnician();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "technician") {
    return NextResponse.json({ error: "Not a technician" }, { status: 403 });
  }
  try {
    const technician = await getTechnicianByUserId(auth.userId);
    if (!technician) {
      return NextResponse.json(
        { error: "Technician profile not found for this user" },
        { status: 404 }
      );
    }
    return NextResponse.json(technician);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
