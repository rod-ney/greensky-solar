import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthUserByIdAndEmailFromDb } from "@/lib/server/general-repository";

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "technician" | "client";
};

/**
 * Returns the current session from cookies, validated against the database.
 * Returns null if unauthenticated or if cookies don't match a valid user.
 */
export async function getSessionFromCookies(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const gsAuth = cookieStore.get("gs_auth")?.value;
  const userId = cookieStore.get("gs_user_id")?.value;
  const email = cookieStore.get("gs_user_email")?.value;
  const role = cookieStore.get("gs_role")?.value;

  if (!gsAuth || !userId || !email || !role) {
    return null;
  }

  const validRoles = ["admin", "technician", "client"];
  if (!validRoles.includes(role)) {
    return null;
  }

  const user = await getAuthUserByIdAndEmailFromDb(userId, email);
  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as AuthSession["role"],
  };
}

/**
 * Requires admin role. Returns 401 if unauthenticated, 403 if not admin.
 */
export async function requireAdmin(): Promise<AuthSession | NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

/**
 * Requires admin or technician role.
 */
export async function requireAdminOrTechnician(): Promise<
  AuthSession | NextResponse
> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin" && session.role !== "technician") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

/**
 * Requires any authenticated user.
 */
export async function requireAuth(): Promise<AuthSession | NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

/**
 * Requires client role (for client-scoped APIs).
 */
export async function requireClient(): Promise<AuthSession | NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}
