import { NextResponse } from "next/server";
import {
  updateDocumentApprovalStatusInDb,
  documentBelongsToUser,
} from "@/lib/server/client-documents-repository";
import { requireClient } from "@/lib/server/auth-guard";
import { updateDocumentSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, updateDocumentSchema);
  if (!result.success) return result.response;
  const { approvalStatus } = result.data;
  try {
    const { id } = await context.params;
    const belongsToUser = await documentBelongsToUser(id, auth.userId);
    if (!belongsToUser) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }
    const updated = await updateDocumentApprovalStatusInDb(id, approvalStatus);
    if (!updated) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
