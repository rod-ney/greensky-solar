export const IMAGE_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const PDF_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export const REPORT_ATTACHMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const COMPLIANCE_ATTACHMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function getUploadSizeLimitByMime(mime: string): number | null {
  if (mime === "application/pdf") return PDF_UPLOAD_MAX_BYTES;
  if (mime.startsWith("image/")) return IMAGE_UPLOAD_MAX_BYTES;
  return null;
}

export function formatUploadSizeLimit(bytes: number): string {
  return `${bytes / (1024 * 1024)} MB`;
}

export function validateUploadFileSize(
  file: Pick<File, "size" | "type">,
  allowedTypes: readonly string[],
  invalidTypeMessage: string
): string | null {
  if (!allowedTypes.includes(file.type)) return invalidTypeMessage;

  const limit = getUploadSizeLimitByMime(file.type);
  if (limit === null) return invalidTypeMessage;
  if (file.size > limit) {
    return `File too large. Maximum size is ${formatUploadSizeLimit(limit)}.`;
  }

  return null;
}