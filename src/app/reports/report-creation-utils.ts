export type ReportCreationType = "service" | "quotation" | "revenue";

export function canCreateReport(params: {
  title: string;
  type: ReportCreationType;
  attachment: File | null;
}) {
  const hasTitle = params.title.trim().length > 0;
  const hasAttachment = Boolean(params.attachment);

  if (!hasTitle) return false;
  if (params.type === "quotation") return true;
  return hasAttachment;
}
