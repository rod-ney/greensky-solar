import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClient } from "@/lib/server/auth-guard";
import {
  getCompliancePreferencesFromDb,
  pruneComplianceTimelineForUser,
  syncComplianceTimelineForUser,
  upsertCompliancePreferencesInDb,
} from "@/lib/server/compliance-repository";

const bodySchema = z.object({
  inSubdivision: z.boolean(),
  wantsNetMetering: z.boolean(),
});

export async function PUT(request: Request) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    await upsertCompliancePreferencesInDb(auth.userId, {
      inSubdivision: parsed.data.inSubdivision,
      wantsNetMetering: parsed.data.wantsNetMetering,
    });
    await pruneComplianceTimelineForUser(auth.userId);
    await syncComplianceTimelineForUser(auth.userId);
    const preferences = await getCompliancePreferencesFromDb(auth.userId);
    return NextResponse.json(preferences);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
