const PH_TZ = "Asia/Manila";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

