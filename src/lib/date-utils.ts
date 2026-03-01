/** Philippines timezone for consistent date handling */
export const PH_TZ = "Asia/Manila";

/** Current date in Philippines as YYYY-MM-DD */
export function getTodayInManila(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: PH_TZ })
    .slice(0, 10);
}

/** Convert string or Date to YYYY-MM-DD in Philippines timezone */
export function toIsoDateManila(value: string | Date): string {
  if (typeof value === "string") {
    const s = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-CA", { timeZone: PH_TZ }).slice(0, 10);
}

/** Parse time string like "08:00 AM" or "01:00 PM" to hours (0-23) and minutes */
function parseTimeToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Check if date + time (e.g. "08:00 AM") is in the past, using Philippines timezone */
export function isPastDateTime(date: string, time: string): boolean {
  const today = getTodayInManila();
  if (date < today) return true;
  if (date > today) return false;
  const now = new Date();
  const manilaNow = new Date(now.toLocaleString("en-US", { timeZone: PH_TZ }));
  const currentMinutes = manilaNow.getHours() * 60 + manilaNow.getMinutes();
  const bookingMinutes = parseTimeToMinutes(time);
  return bookingMinutes <= currentMinutes;
}
