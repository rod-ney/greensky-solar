const PH_TZ = "Asia/Manila";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** PHP with two decimal places (invoices, client payments). */
export function formatCurrencyDecimal(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format date string (YYYY-MM-DD) for display in Philippines timezone */
export function formatDate(dateString: string): string {
  const iso = dateString.slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return date.toLocaleDateString("en-US", {
    timeZone: PH_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Booking schedule: start through end, or one day if `end` is missing or equals `start`. */
export function formatBookingSchedule(start: string, end?: string): string {
  const s = start.slice(0, 10);
  const e = end?.slice(0, 10);
  if (e && e !== s) {
    return `${formatDate(start)} – ${formatDate(end!)}`;
  }
  return formatDate(start);
}

/**
 * Client-facing quotation number. Internal report ids use `rep-###`; surface as `QTN-###`
 * (aligned with quotation PDFs).
 */
export function formatQuotationNumberFromReportId(reportId: string): string {
  const quotationDigits = reportId.match(/\d+/)?.[0] ?? "1";
  return `QTN-${String(Number(quotationDigits) || 1).padStart(3, "0")}`;
}

