import { formatDate, formatQuotationNumberFromReportId } from "@/lib/format";

export type QuotationPdfMaterialItem = {
  description: string;
  qty: number | string;
  amt?: number;
  total?: number;
  warranty?: string;
  supplierWebsite?: string;
};

export type QuotationPdfInput = {
  reportId: string;
  submittedAt: string;
  submittedBy: string;
  amount?: number;
  clientName?: string;
  location?: string;
  clientNumber?: string;
  clientEmail?: string;
  customerId?: string;
  validUntil?: string;
  technician?: string;
  descriptionOfWork?: string;
  materialItems: QuotationPdfMaterialItem[];
  dpPercent?: number;
  packageOptions?: { label: string; amount: number }[];
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

function formatPhp(amount: number): string {
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Pre-populate smart default warranties & websites based on material description */
function getDefaultWarrantyAndWebsite(desc: string): { warranty: string; website: string } {
  const lower = desc.toLowerCase();
  if (lower.includes("panel") || lower.includes("solar")) {
    return {
      warranty: "15 years product warranty 30 years performance warranty",
      website: "https://www.trinasolar.com/",
    };
  }
  if (lower.includes("inverter") || lower.includes("deye") || lower.includes("solis")) {
    return {
      warranty: "5 years product warranty by Supplier",
      website: "https://www.deyeinverter.com/",
    };
  }
  if (lower.includes("mounting") || lower.includes("railing") || lower.includes("breaker") || lower.includes("spd") || lower.includes("ppe")) {
    return {
      warranty: "1-year Full System Engineering and Workmanship Warranty",
      website: "Greensky Solar Philippines (Sta. Rosa, Laguna)",
    };
  }
  if (lower.includes("thhn") || lower.includes("wire") || lower.includes("cable") || lower.includes("grounding")) {
    return {
      warranty: "1-year Workmanship Warranty",
      website: "Greensky Solar Philippines",
    };
  }
  if (lower.includes("battery") || lower.includes("lifepo4") || lower.includes("lpo4") || lower.includes("srne") || lower.includes("ginza")) {
    return {
      warranty: "10 years product warranty by Supplier",
      website: "https://www.sunwaystech.com/",
    };
  }
  return {
    warranty: "1-year Workmanship Warranty",
    website: "Greensky Solar Philippines",
  };
}

async function loadLogoBase64(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/logo_greenskypdf.png";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => {
        img.src = "/logo_greensky.png";
        img.onload = resolve;
        img.onerror = reject;
      };
      setTimeout(() => reject(new Error("Timeout loading logo")), 1500);
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function downloadQuotationReportPdf(input: QuotationPdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const left = 12;
  const right = 198;
  const contentWidth = right - left; // 186mm
  const quotationNo = formatQuotationNumberFromReportId(input.reportId);
  const logoDataUrl = await loadLogoBase64();

  // Color Palette matching reference standard
  const greenHeaderRgb: [number, number, number] = [166, 201, 135]; // #A6C987
  const totalGreenRgb: [number, number, number] = [198, 224, 180];  // #C6E0B4
  const grayHeaderRgb: [number, number, number] = [217, 217, 217];  // #D9D9D9
  const textDarkRgb: [number, number, number] = [30, 30, 30];
  const borderRgb: [number, number, number] = [80, 80, 80];

  let currentY = 10;

  // Helper functions
  const setDraw = () => doc.setDrawColor(...borderRgb);
  const setLineThin = () => doc.setLineWidth(0.25);
  const setLineBold = () => doc.setLineWidth(0.4);

  // ==========================================
  // 1. HEADER SECTION
  // ==========================================

  // Logo
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", left, currentY, 34, 26);
    } catch {
      // Fallback
    }
  }

  const titleX = logoDataUrl ? left + 36 : left;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...textDarkRgb);
  doc.text("Greensky Solar Panel Installation Services", titleX, currentY + 12);

  const addrY = currentY + 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...textDarkRgb);
  doc.text("Sparta Drive, Corinthian Homes Brgy Macabling,", left, addrY);
  doc.text("City of Santa Rosa Laguna, Philippines, 4026", left, addrY + 4);
  doc.text("Phone: 09764182003", left, addrY + 8);
  doc.text("solargreensky@gmail.com", left, addrY + 12);

  // QUOTATION Title (Top Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("QUOTATION", right, currentY + 5, { align: "right" });

  // Quotation Meta Grid Table (Right Aligned: 56mm wide)
  const metaW = 56;
  const metaX = right - metaW;
  const col1W = 26;
  const col2W = 30;
  const metaY = currentY + 8;
  const rowH = 4.8;

  setDraw();
  setLineThin();

  // Row 1 Header (Green)
  doc.setFillColor(...greenHeaderRgb);
  doc.rect(metaX, metaY, col1W, rowH, "FD");
  doc.rect(metaX + col1W, metaY, col2W, rowH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Ref #", metaX + col1W / 2, metaY + 3.4, { align: "center" });
  doc.text("Date", metaX + col1W + col2W / 2, metaY + 3.4, { align: "center" });

  // Row 1 Data
  doc.setFillColor(255, 255, 255);
  doc.rect(metaX, metaY + rowH, col1W, rowH, "FD");
  doc.rect(metaX + col1W, metaY + rowH, col2W, rowH, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(safePdfText(quotationNo), metaX + col1W / 2, metaY + rowH + 3.4, { align: "center" });
  doc.text(safePdfDate(input.submittedAt), metaX + col1W + col2W / 2, metaY + rowH + 3.4, { align: "center" });

  // Row 2 Header (Green)
  doc.setFillColor(...greenHeaderRgb);
  doc.rect(metaX, metaY + rowH * 2, col1W, rowH, "FD");
  doc.rect(metaX + col1W, metaY + rowH * 2, col2W, rowH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Customer ID", metaX + col1W / 2, metaY + rowH * 2 + 3.4, { align: "center" });
  doc.text("Valid", metaX + col1W + col2W / 2, metaY + rowH * 2 + 3.4, { align: "center" });

  // Row 2 Data
  doc.setFillColor(255, 255, 255);
  doc.rect(metaX, metaY + rowH * 3, col1W, rowH, "FD");
  doc.rect(metaX + col1W, metaY + rowH * 3, col2W, rowH, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  const custId = input.customerId || `CUST-${(input.reportId || "").slice(-4).toUpperCase() || "001"}`;
  const validUntilDate = input.validUntil || (input.submittedAt ? new Date(new Date(input.submittedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : "");

  doc.text(safePdfText(custId), metaX + col1W / 2, metaY + rowH * 3 + 3.4, { align: "center" });
  doc.text(safePdfDate(validUntilDate), metaX + col1W + col2W / 2, metaY + rowH * 3 + 3.4, { align: "center" });

  currentY = addrY + 16; // y = ~46

  // ==========================================
  // 2. CUSTOMER INFO SECTION
  // ==========================================
  doc.setFillColor(...grayHeaderRgb);
  doc.rect(left, currentY, contentWidth, 5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("CUSTOMER INFO", left + contentWidth / 2, currentY + 3.6, { align: "center" });

  currentY += 5;
  const custBoxH = 14;
  doc.rect(left, currentY, contentWidth, custBoxH);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${safePdfText(input.clientName || "-")}`, left + 3, currentY + 4.2);
  doc.text(`Address/Location: ${safePdfText(input.location || "-")}`, left + 3, currentY + 8.4);
  const contactStr = [input.clientNumber, input.clientEmail].filter(Boolean).join(" / ");
  doc.text(`Contact Details, E-mail: ${safePdfText(contactStr || "-")}`, left + 3, currentY + 12.6);

  currentY += custBoxH + 3; // y = ~57

  // ==========================================
  // 3. DESCRIPTION OF WORK SECTION
  // ==========================================
  doc.setFillColor(...greenHeaderRgb);
  doc.rect(left, currentY, contentWidth, 5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("DESCRIPTION OF WORK", left + contentWidth / 2, currentY + 3.6, { align: "center" });

  currentY += 5;

  const defaultDescLines = [
    input.descriptionOfWork || "6kw Hybrid Solar Setup w/ 300Ah / 51.2v LifePO4 Battery",
    "Design and Installation of high quality Solar Panels/PV Modules with 6kw Power Inverter.",
    "Installation of Railing and Mountings and other Misc. Materials; AC Wire Grounding",
    "With after service of 1 free cleaning and workmanship.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  let descTextLines: string[] = [];
  if (input.descriptionOfWork) {
    descTextLines = doc.splitTextToSize(safePdfText(input.descriptionOfWork), contentWidth - 6);
  } else {
    descTextLines = defaultDescLines;
  }

  const descLineH = 3.8;
  const descBoxH = Math.max(14, descTextLines.length * descLineH + 3);

  doc.rect(left, currentY, contentWidth, descBoxH);

  let descLineY = currentY + 3.5;
  for (const line of descTextLines) {
    doc.text(line, left + 3, descLineY);
    descLineY += descLineH;
  }

  currentY += descBoxH + 3; // y = ~79

  // ==========================================
  // 4. MATERIALS TABLE SECTION
  // ==========================================
  const matCol1 = 62; // Materials
  const matCol2 = 14; // Qty
  const matCol3 = 45; // Warranty
  const matCol4 = 40; // Website
  const matCol5 = 25; // Amount

  // Table Header Banner (Green)
  doc.setFillColor(...greenHeaderRgb);
  doc.rect(left, currentY, contentWidth, 5, "FD");

  // Vertical Header Dividers
  let curX = left;
  doc.line(curX + matCol1, currentY, curX + matCol1, currentY + 5);
  curX += matCol1;
  doc.line(curX + matCol2, currentY, curX + matCol2, currentY + 5);
  curX += matCol2;
  doc.line(curX + matCol3, currentY, curX + matCol3, currentY + 5);
  curX += matCol3;
  doc.line(curX + matCol4, currentY, curX + matCol4, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  doc.text("MATERIALS", left + matCol1 / 2, currentY + 3.6, { align: "center" });
  doc.text("QTY", left + matCol1 + matCol2 / 2, currentY + 3.6, { align: "center" });
  doc.text("WARRANTY", left + matCol1 + matCol2 + matCol3 / 2, currentY + 3.6, { align: "center" });
  doc.text("Supplier's Website", left + matCol1 + matCol2 + matCol3 + matCol4 / 2, currentY + 3.6, { align: "center" });
  doc.text("AMOUNT", right - matCol5 / 2, currentY + 3.6, { align: "center" });

  currentY += 5;

  // Render Table Rows
  const materialList = input.materialItems.length > 0 ? input.materialItems : [
    { description: "Trina Bifacial Solar Panels 620watts", qty: 10, amt: 0, total: 0 },
    { description: "6kw Deye/Solis Single Phase Inverter", qty: 1, amt: 0, total: 0 },
    { description: "Complete Mounting Set / Railings Circuit Breakers, SPD, Wiring, PPE's", qty: "1 lot", amt: 0, total: 0 },
    { description: "#10thhn ; #8 thhn", qty: "1 lot", amt: 0, total: 0 },
    { description: "Leodar/Ginza/SRNE 314AH/330ah 51.2V LifePo4 Battery", qty: "N/A", amt: 0, total: 0 },
  ];

  let calculatedSubtotal = 0;

  for (const item of materialList) {
    const descStr = safePdfText(item.description);
    const qtyStr = safePdfText(String(item.qty || "1"));
    const defaults = getDefaultWarrantyAndWebsite(descStr);

    const warrantyStr = safePdfText(item.warranty || defaults.warranty);
    const websiteStr = safePdfText(item.supplierWebsite || defaults.website);

    const lineAmt = toNumber(item.total) || (toNumber(item.qty) * toNumber(item.amt));
    calculatedSubtotal += lineAmt;
    const amountStr = lineAmt > 0 ? formatPhp(lineAmt) : "";

    // Calculate line splits
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    const matLines = doc.splitTextToSize(descStr, matCol1 - 4);
    const warLines = doc.splitTextToSize(warrantyStr, matCol3 - 4);
    const webLines = doc.splitTextToSize(websiteStr, matCol4 - 4);

    const maxLineCount = Math.max(matLines.length, warLines.length, webLines.length, 1);
    const rowHeight = Math.max(7, maxLineCount * 3.5 + 3);

    // Draw row rectangle
    doc.rect(left, currentY, contentWidth, rowHeight);

    // Vertical dividers
    let divX = left;
    doc.line(divX + matCol1, currentY, divX + matCol1, currentY + rowHeight);
    divX += matCol1;
    doc.line(divX + matCol2, currentY, divX + matCol2, currentY + rowHeight);
    divX += matCol2;
    doc.line(divX + matCol3, currentY, divX + matCol3, currentY + rowHeight);
    divX += matCol3;
    doc.line(divX + matCol4, currentY, divX + matCol4, currentY + rowHeight);

    // Print text
    let textY = currentY + 3.8;
    for (let i = 0; i < matLines.length; i++) {
      doc.text(matLines[i], left + 2, textY + i * 3.5);
    }

    doc.text(qtyStr, left + matCol1 + matCol2 / 2, currentY + 4.2, { align: "center" });

    for (let i = 0; i < warLines.length; i++) {
      doc.text(warLines[i], left + matCol1 + matCol2 + 2, textY + i * 3.5);
    }

    for (let i = 0; i < webLines.length; i++) {
      doc.text(webLines[i], left + matCol1 + matCol2 + matCol3 + 2, textY + i * 3.5);
    }

    if (amountStr) {
      doc.text(amountStr, right - 2, currentY + 4.2, { align: "right" });
    }

    currentY += rowHeight;
  }

  // Grand Total / Package Rows (Light Green Background)
  const grandTotal = toNumber(input.amount) || calculatedSubtotal;
  const packageRows = input.packageOptions && input.packageOptions.length > 0
    ? input.packageOptions
    : (grandTotal > 0
        ? [{ label: "Total Package Amount", amount: grandTotal }]
        : [
            { label: "Total Package with 314ah Battery", amount: 434000 },
            { label: "Total Package with 330ah Battery", amount: 439000 },
          ]);

  for (const pkg of packageRows) {
    const pkgRowH = 5.5;
    doc.setFillColor(...totalGreenRgb);
    doc.rect(left, currentY, contentWidth, pkgRowH, "FD");

    // Line divider before amount column
    doc.line(right - matCol5, currentY, right - matCol5, currentY + pkgRowH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(safePdfText(pkg.label), right - matCol5 - 3, currentY + 3.8, { align: "right" });
    doc.text(formatPhp(pkg.amount), right - 2, currentY + 3.8, { align: "right" });

    currentY += pkgRowH;
  }

  currentY += 4; // y = ~170

  // ==========================================
  // 5. SCHEDULE AND TENDER APPROVAL SECTION
  // ==========================================
  doc.setFillColor(...greenHeaderRgb);
  doc.rect(left, currentY, contentWidth, 5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("SCHEDULE AND TENDER APPROVAL", left + contentWidth / 2, currentY + 3.6, { align: "center" });

  currentY += 5;

  const scheduleBoxH = 46;
  doc.rect(left, currentY, contentWidth, scheduleBoxH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("This quotation is not a contract or a bill.", left + 3, currentY + 4);

  doc.setFont("helvetica", "normal");
  doc.text("Reservation Fee: Php5,000 (To reserve the installation date deductible on the contract price).", left + 3, currentY + 8);
  doc.text("Note: 60% refundable within 7 days; 50% beyond 7 up to 10 days ; non-refundable beyond 10 days.", left + 3, currentY + 12);

  doc.setFont("helvetica", "bold");
  doc.text("Downpayment:", left + 3, currentY + 16);
  doc.setFont("helvetica", "normal");
  doc.text("1st Payment: 50% of the Contract Price after Day 1 work completion.", left + 5, currentY + 20);
  doc.text("2nd Payment: 50% of the Contract Price after the Completion of the Services and Deliverables/testing.", left + 5, currentY + 24);

  // Payment mode checkboxes
  doc.text("Payment Mode:", left + 3, currentY + 30);

  // Cash Box
  doc.text("Cash:", left + 35, currentY + 30);
  doc.rect(left + 45, currentY + 26.5, 30, 4.5);

  // Bank Transfer Box
  doc.text("Bank Transfer:", left + 85, currentY + 30);
  doc.rect(left + 105, currentY + 26.5, 30, 4.5);

  // Conforme disclaimer
  doc.setFontSize(7);
  doc.text(
    "I, as the client/duly authorized representative of the client, accept the offer constituted by this proposal and agree to the conditions contained herein.",
    left + 3,
    currentY + 38
  );

  currentY += scheduleBoxH + 15; // y = ~240

  // ==========================================
  // 6. CONFORME & SIGNATURES FOOTER
  // ==========================================
  const sigLineW = 60;
  const leftSigX = left + 20;
  const rightSigX = right - sigLineW - 10;

  setLineBold();
  doc.line(leftSigX, currentY, leftSigX + sigLineW, currentY);
  doc.line(rightSigX, currentY, rightSigX + sigLineW, currentY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CONFORME:", leftSigX - 18, currentY - 0.5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Printed Name & Signature", leftSigX + sigLineW / 2, currentY + 4, { align: "center" });
  doc.text("Company Representative", rightSigX + sigLineW / 2, currentY + 4, { align: "center" });

  const safeClientName = safeFileName(input.clientName || "Client");
  doc.save(`Quotation for ${safeClientName} - ${quotationNo}.pdf`);
}

