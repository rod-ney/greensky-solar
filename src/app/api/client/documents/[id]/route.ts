import { NextResponse } from "next/server";
import {
  updateDocumentApprovalStatusInDb,
  documentBelongsToUser,
  deleteClientDocumentFromDb,
} from "@/lib/server/client-documents-repository";
import { getReportByIdFromDb, updateReportInDb, listUsersFromDb } from "@/lib/server/general-repository";
import { requireClient } from "@/lib/server/auth-guard";
import { updateDocumentSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { createNotification, getAdminUserIds } from "@/lib/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(request, updateDocumentSchema);
  if (!result.success) return result.response;
  const { approvalStatus, rejectionComment } = result.data;
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

    const trimmedComment = rejectionComment?.trim();
    if (
      approvalStatus === "rejected" &&
      trimmedComment &&
      updated.linkedReportType === "quotation" &&
      updated.reportId
    ) {
      const report = await getReportByIdFromDb(updated.reportId);
      if (report?.type === "quotation") {
        try {
          const parsed = JSON.parse(report.description) as Record<string, unknown>;
          const nextDescription = JSON.stringify({
            ...parsed,
            clientComment: trimmedComment,
          });
          await updateReportInDb(report.id, { description: nextDescription });
        } catch {
          // Keep document rejection successful even if comment sync fails.
        }

        const users = await listUsersFromDb();
        const submittedBy = report.submittedBy.toLowerCase();
        const technicianUserId =
          users.find((u) => u.id.toLowerCase() === submittedBy)?.id ??
          users.find((u) => u.email.toLowerCase() === submittedBy)?.id ??
          users.find((u) => u.name.toLowerCase() === submittedBy)?.id ??
          null;

        const adminIds = await getAdminUserIds();
        const recipientIds = new Set<string>(adminIds);
        if (technicianUserId) recipientIds.add(technicianUserId);

        await Promise.all(
          Array.from(recipientIds).map((userId) =>
            createNotification(
              userId,
              "report_rejected",
              "Quotation rejected by client",
              trimmedComment,
              "/reports"
            )
          )
        );
      }
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await context.params;
    const deleted = await deleteClientDocumentFromDb(id, auth.userId);
    if (!deleted) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
