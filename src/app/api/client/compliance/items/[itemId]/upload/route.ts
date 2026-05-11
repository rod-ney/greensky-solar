import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getTodayInManila } from "@/lib/date-utils";
import { requireClient } from "@/lib/server/auth-guard";
import {
  addClientDocumentToDb,
  deleteClientDocumentFromDb,
} from "@/lib/server/client-documents-repository";
import {
  clearUploadedComplianceDocumentInDb,
  getComplianceItemForUser,
  updateComplianceItemDocumentInDb,
} from "@/lib/server/compliance-repository";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  const { itemId } = await context.params;

  try {
    const item = await getComplianceItemForUser(itemId, auth.userId);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (item.suppliedBy !== "client") {
      return NextResponse.json(
        { error: "This document is provided by GreenSky Solar." },
        { status: 400 }
      );
    }
    if (item.status === "approved") {
      return NextResponse.json(
        { error: "This requirement is already approved." },
        { status: 400 }
      );
    }
    if (item.status === "waived") {
      return NextResponse.json({ error: "This requirement was waived." }, { status: 400 });
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
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use PDF, JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extForMime(file.type);
    const safeUser = auth.userId.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeItem = itemId.replace(/[^a-zA-Z0-9-]/g, "");
    const filename = `${safeItem}-${Date.now()}.${ext}`;
    const relativeDir = path.join("public", "uploads", "compliance", safeUser);
    const absoluteDir = path.join(process.cwd(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const absolutePath = path.join(absoluteDir, filename);
    await writeFile(absolutePath, buffer);

    const publicUrl = `/uploads/compliance/${safeUser}/${filename}`;
    const today = getTodayInManila();

    const doc = await addClientDocumentToDb(
      {
        title: sanitizeClientFilename(file.name),
        type: "permit",
        fileSize: formatFileSize(file.size),
        uploadedAt: today,
        projectName: item.projectName,
        status: "active",
        approvalStatus: "pending",
        fileUrl: publicUrl,
      },
      auth.userId
    );

    const updated = await updateComplianceItemDocumentInDb(
      itemId,
      auth.userId,
      doc.id,
      "submitted"
    );
    if (!updated) {
      return NextResponse.json({ error: "Failed to link document." }, { status: 500 });
    }

    const nextItem = await getComplianceItemForUser(itemId, auth.userId);
    return NextResponse.json({ item: nextItem, document: doc });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const auth = await requireClient();
  if (auth instanceof NextResponse) return auth;
  const { itemId } = await context.params;

  try {
    const item = await getComplianceItemForUser(itemId, auth.userId);
    if (!item) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (item.suppliedBy !== "client") {
      return NextResponse.json({ error: "This document is provided by GreenSky Solar." }, { status: 400 });
    }
    if (item.status === "approved") {
      return NextResponse.json(
        { error: "Approved submissions cannot be removed here." },
        { status: 400 }
      );
    }
    if (item.status === "waived" || !item.documentId || !item.fileUrl) {
      return NextResponse.json({ error: "Nothing to remove." }, { status: 400 });
    }

    await unlinkComplianceDiskFile(item.fileUrl);

    const cleared = await clearUploadedComplianceDocumentInDb(
      itemId,
      auth.userId,
      item.documentId
    );
    if (!cleared) {
      return NextResponse.json({ error: "Could not clear upload." }, { status: 500 });
    }

    await deleteClientDocumentFromDb(item.documentId, auth.userId);

    const nextItem = await getComplianceItemForUser(itemId, auth.userId);
    return NextResponse.json({ item: nextItem });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
