import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClient } from "@/lib/server/auth-guard";
import {
  getComplianceItemForUser,
  updateComplianceItemStatusInDb,
} from "@/lib/server/compliance-repository";

const patchSchema = z.object({
  status: z.enum(["waived"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  const { itemId } = await context.params;
  try {
    const json = (await request.json()) as unknown;
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const item = await getComplianceItemForUser(itemId, auth.userId);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (parsed.data.status === "waived") {
      if (!item.isOptional) {
        return NextResponse.json(
          { error: "Only optional requirements can be waived." },
          { status: 400 }
        );
      }
      if (item.status === "approved" || item.documentId) {
        return NextResponse.json(
          { error: "Cannot waive an item that already has a submission." },
          { status: 400 }
        );
      }
      const ok = await updateComplianceItemStatusInDb(itemId, auth.userId, "waived");
      if (!ok) {
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
      }
    }
    const next = await getComplianceItemForUser(itemId, auth.userId);
    return NextResponse.json(next);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
