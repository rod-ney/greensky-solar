import { formatDate, formatQuotationNumberFromReportId } from "@/lib/format";

export type QuotationPdfMaterialItem = {
  description: string;
  qty: number;
  amt: number;
  total: number;
};

export type QuotationPdfInput = {
  reportId: string;
  submittedAt: string;
  submittedBy: string;
  amount?: number;
  clientName?: string;
  location?: string;
  clientNumber?: string;
  technician?: string;
  materialItems: QuotationPdfMaterialItem[];
  dpPercent?: number;
};

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "").trim();
}

function safePdfText(value?: string | number | null): string {
  return String(value ?? "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safePdfDate(value?: string | null): string {
  try {
    if (!value) return "-";
    return safePdfText(formatDate(value));
  } catch {
    return safePdfText(value);
  }
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function downloadQuotationReportPdf(input: QuotationPdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const left = 10;
  const right = pageWidth - 10;
  const contentWidth = right - left;
  const midpoint = left + contentWidth / 2;
  const lineHeight = 6;
  const money = (value: unknown) => `PHP ${toNumber(value).toFixed(2)}`;
  const subtotal = input.materialItems.reduce(
    (sum, item) => sum + toNumber(item.total),
    0
  );
  const grandTotal = toNumber(input.amount) || subtotal;
  const quotationNo = formatQuotationNumberFromReportId(input.reportId);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("email: solargreensky@gmail.com", pageWidth / 2, 8, { align: "center" });
  doc.setLineWidth(0.4);
  doc.rect(left, 10, contentWidth, 6);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Service Report & Quotation", pageWidth / 2, 14.5, { align: "center" });
  doc.setFont("helvetica", "normal");

  const labelRow = (x: number, y: number, label: string, value: string) => {
    doc.rect(x, y, 22, lineHeight);
    doc.rect(x + 22, y, contentWidth / 2 - 22 - 2, lineHeight);
    doc.setFontSize(9);
    doc.text(safePdfText(label), x + 1, y + 4.2);
    doc.text(safePdfText(value), x + 24, y + 4.2);
  };

  labelRow(left, 20, "Date", safePdfDate(input.submittedAt));
  labelRow(midpoint + 1, 20, "Quotation No.", quotationNo);
  labelRow(left, 26, "Client", input.clientName || "-");
  labelRow(midpoint + 1, 26, "Location", input.location || "-");
  labelRow(left, 32, "Contact #", input.clientNumber || "-");
  labelRow(midpoint + 1, 32, "Sales Person", input.technician || input.submittedBy || "-");

  doc.setFont("helvetica", "bold");
  doc.text("SUBJECT :    ITEMS / MATERIALS FOR REPLACEMENT", left, 45);
  doc.setFont("helvetica", "normal");

  const descX = left;
  const qtyX = 126;
  const amtX = 146;
  const totalX = 166;
  doc.setFontSize(9);
  doc.text("DESCRIPTION", descX + 40, 51);
  doc.text("QTY.", qtyX + 4, 51);
  doc.text("AMT", amtX + 4, 51);
  doc.text("TOTAL", totalX + 2, 51);

  let y = 55;
  const maxRows = 15;
  for (let i = 0; i < maxRows; i += 1) {
    const row = input.materialItems[i];
    doc.line(descX, y, 122, y);
    doc.line(qtyX, y, 142, y);
    doc.line(amtX, y, 162, y);
    doc.line(totalX, y, right, y);
    if (row) {
      doc.setFontSize(8.5);
      doc.text(safePdfText((row.description || "").slice(0, 70)), descX + 1, y - 1.2);
      doc.text(safePdfText(String(toNumber(row.qty))), qtyX + 7, y - 1.2);
      doc.text(safePdfText(toNumber(row.amt).toFixed(2)), amtX + 2, y - 1.2);
      doc.text(safePdfText(toNumber(row.total).toFixed(2)), totalX + 2, y - 1.2);
    }
    y += 7;
  }

  doc.setFontSize(10);
  doc.text(safePdfText(`Technicians: ${input.technician || input.submittedBy || "-"}`), left, 166);
  doc.text(safePdfText(`SUB TOTAL: ${money(subtotal)}`), 140, 166);
  doc.setFont("helvetica", "bold");
  doc.text(safePdfText(`TOTAL: ${money(grandTotal)}`), 140, 173);
  doc.setFont("helvetica", "normal");

  doc.setFontSize(9);
  const notesStart = 182;
  const dpPercent = input.dpPercent ?? 50;
  doc.text(safePdfText(`DP or Down Payment is ${dpPercent}% of the Total cost.`), left, notesStart);
  doc.text(safePdfText("Spare parts sourcing will start once the client approves and deposited the DP."), left, notesStart + 5);
  doc.text(safePdfText("Servicing will start once the spare parts and materials are completed."), left, notesStart + 10);
  doc.text(safePdfText("This service report & quote is VAT exclusive and valid for 15 days only."), left, notesStart + 15);
  doc.text(safePdfText("Looking forward for your business"), left, notesStart + 20);
  doc.text(safePdfText("Terms and Condition"), left, notesStart + 29);
  doc.text(safePdfText("1. Warranty: 3 months and applies to replaced parts and materials only."), left, notesStart + 35);
  doc.text(safePdfText("2. Quoted price is subject to change without notice and valid for 15 days only."), left, notesStart + 40);
  doc.text(safePdfText("3. Hidden or defective parts/materials are not covered in the quotation."), left, notesStart + 45);
  doc.text(safePdfText("4. Non-refundable down payment: Down payment are not refundable."), left, notesStart + 50);

  const safeClientName = safeFileName(input.clientName || "Client");
  doc.save(`Quotation for ${safeClientName} - ${quotationNo}.pdf`);
}
