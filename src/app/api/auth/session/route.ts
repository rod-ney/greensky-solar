import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/server/auth-guard";

/**
 * Returns the current session for client-side display.
 * Server reads HttpOnly cookies and returns user info.
 */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    name: session.name,
    email: session.email,
    role: session.role,
  });
}
