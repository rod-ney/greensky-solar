import { NextResponse } from "next/server";
import { requireClient } from "@/lib/server/auth-guard";
import { listClientProjectsFromDb } from "@/lib/server/projects-repository";
import {
  getCompliancePreferencesFromDb,
  listComplianceTimelineForUser,
  syncComplianceTimelineForUser,
} from "@/lib/server/compliance-repository";

export async function GET() {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    await syncComplianceTimelineForUser(auth.userId);
    const [preferences, items, projects] = await Promise.all([
      getCompliancePreferencesFromDb(auth.userId),
      listComplianceTimelineForUser(auth.userId, null),
      listClientProjectsFromDb(auth.userId),
    ]);

    return NextResponse.json({
      preferences,
      items,
      projects,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
