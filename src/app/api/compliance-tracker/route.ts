import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth-guard";
import {
  listAdminComplianceTrackerItems,
  listUserIdsEligibleForComplianceTracker,
} from "@/lib/server/admin-compliance-repository";
import { syncComplianceTimelineForUser } from "@/lib/server/compliance-repository";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const userIds = await listUserIdsEligibleForComplianceTracker();
    for (const userId of userIds) {
      await syncComplianceTimelineForUser(userId);
    }
    const items = await listAdminComplianceTrackerItems();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
