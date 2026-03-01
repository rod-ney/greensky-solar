import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth-guard";
import { getProfileFromDb, updateProfileInDb } from "@/lib/server/profile-repository";
import { logProfileChangeInDb } from "@/lib/server/audit-log";
import { updateProfileSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const profile = await getProfileFromDb(auth.userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const result = await validateBody(request, updateProfileSchema);
  if (!result.success) return result.response;
  const body = result.data;

  try {
    const updates: {
      name?: string;
      contactNumber?: string | null;
      avatarUrl?: string | null;
      twoFactorEnabled?: boolean;
    } = {};

    if (body.name) updates.name = body.name;
    if (body.contactNumber !== undefined) updates.contactNumber = body.contactNumber;
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl || null;
    if (body.twoFactorEnabled !== undefined) updates.twoFactorEnabled = body.twoFactorEnabled;

    const oldProfile = await getProfileFromDb(auth.userId);
    const updated = await updateProfileInDb({
      userId: auth.userId,
      ...updates,
    });
    if (!updated) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (Object.keys(updates).length > 0 && oldProfile) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        null;
      await logProfileChangeInDb({
        userId: auth.userId,
        action: "update",
        resource: "profile",
        resourceId: auth.userId,
        oldValue: Object.fromEntries(
          Object.entries(updates).map(([k, v]) => [
            k,
            (oldProfile as Record<string, unknown>)[k],
          ])
        ),
        newValue: updates,
        ipAddress: ip,
      });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
