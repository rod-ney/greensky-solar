import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getTodayInManila } from "@/lib/date-utils";
import { requireAdmin } from "@/lib/server/auth-guard";
import {
  addAdminDocumentToDb,
  getComplianceItemById,
  updateAdminComplianceItemDocument,
} from "@/lib/server/admin-compliance-repository";
import {
  COMPLIANCE_ATTACHMENT_ALLOWED_TYPES,
  validateUploadFileSize,
} from "@/lib/upload-constraints";

export const runtime = "nodejs";

function extForMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const COMPLIANCE_UPLOAD_URL_PREFIX = "/uploads/compliance/";

function sanitizeClientFilename(name: string): string {
  const trimmed = name.trim().slice(0, 180);
  const safe = trimmed.replace(/[/\\?\0\u0001-\u001f]/g, "_").trim();
  return safe || "upload";
}

async function unlinkComplianceDiskFile(publicUrl: string | undefined): Promise<void> {
  if (!publicUrl?.startsWith(COMPLIANCE_UPLOAD_URL_PREFIX)) return;
  const relative = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  const resolved = path.resolve(process.cwd(), "public", relative);
  const base = path.resolve(process.cwd(), "public", "uploads", "compliance");
  if (!resolved.startsWith(base)) return;
  try {
    await unlink(resolved);
  } catch {
    // ignore missing file
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { itemId } = await context.params;

  try {
    const item = await getComplianceItemById(itemId);
    if (!item) {
      return NextResponse.json({ error: "Compliance item not found" }, { status: 404 });
    }

    if (item.suppliedBy !== "admin") {
      return NextResponse.json(
        { error: "Only admin-queue items can have solar diagrams uploaded." },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart form data with a file field." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const uploadError = validateUploadFileSize(
      file,
      COMPLIANCE_ATTACHMENT_ALLOWED_TYPES,
      "Invalid file type. Use PDF, JPEG, PNG, or WebP."
    );
    if (uploadError) {
      return NextResponse.json({ error: uploadError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extForMime(file.type);
    const safeItem = itemId.replace(/[^a-zA-Z0-9-]/g, "");
    const filename = `solar-diagram-${safeItem}-${Date.now()}.${ext}`;
    const relativeDir = path.join("public", "uploads", "compliance", "admin");
    const absoluteDir = path.join(process.cwd(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const absolutePath = path.join(absoluteDir, filename);
    await writeFile(absolutePath, buffer);

    const publicUrl = `/uploads/compliance/admin/${filename}`;
    const today = getTodayInManila();

    const doc = await addAdminDocumentToDb(
      {
        title: sanitizeClientFilename(file.name),
        type: "report",
        fileSize: formatFileSize(file.size),
        uploadedAt: today,
        projectName: item.projectName,
        status: "active",
        approvalStatus: "approved",
        fileUrl: publicUrl,
      },
      auth.userId
    );

    const updated = await updateAdminComplianceItemDocument(itemId, doc.id);
    if (!updated) {
      await unlinkComplianceDiskFile(publicUrl);
      return NextResponse.json({ error: "Failed to link document." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Solar diagram uploaded successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { itemId } = await context.params;

  try {
    const item = await getComplianceItemById(itemId);
    if (!item) {
      return NextResponse.json({ error: "Compliance item not found" }, { status: 404 });
    }

    if (!item.fileUrl) {
      return NextResponse.json({ error: "No diagram to remove." }, { status: 400 });
    }

    await unlinkComplianceDiskFile(item.fileUrl);

    const cleared = await updateAdminComplianceItemDocument(itemId, null);
    if (!cleared) {
      return NextResponse.json({ error: "Failed to remove diagram." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Solar diagram removed." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
