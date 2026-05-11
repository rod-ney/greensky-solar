import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth-guard";
import { adminReviewComplianceItemInDb } from "@/lib/server/admin-compliance-repository";
import { createNotification } from "@/lib/notifications";

const bodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

type RouteContext = { params: Promise<{ itemId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const { itemId } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "decision must be approved or rejected." }, { status: 400 });
  }

  try {
    const result = await adminReviewComplianceItemInDb(itemId, parsed.data.decision);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const title =
      parsed.data.decision === "approved"
        ? "Compliance document approved"
        : "Compliance document needs revision";
    const message =
      parsed.data.decision === "approved"
        ? `Your upload for "${result.itemTitle}" was approved.`
        : `Your upload for "${result.itemTitle}" was rejected. Please upload a revised file.`;

    await createNotification(
      result.clientUserId,
      "document_available",
      title,
      message,
      "/client/compliance"
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
