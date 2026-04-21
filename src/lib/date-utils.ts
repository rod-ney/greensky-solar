/** Philippines timezone for consistent date handling */
export const PH_TZ = "Asia/Manila";

/** Current date in Philippines as YYYY-MM-DD */
export function getTodayInManila(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: PH_TZ })
    .slice(0, 10);
}

/** Lexicographic max of two YYYY-MM-DD strings (valid for ISO dates). */
export function maxIsoDate(a: string, b: string): string {
  return a >= b ? a : b;
}

/** Lexicographic min of two YYYY-MM-DD strings. */
export function minIsoDate(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Local midnight timestamp for a calendar YYYY-MM-DD (browser local timezone). */
export function isoDateLocalMidnightMs(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Add calendar days to a YYYY-MM-DD (UTC date arithmetic; stable for PH, no DST). */
export function addDaysToIso(iso: string, delta: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const y2 = dt.getUTCFullYear();
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d2 = String(dt.getUTCDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

/** Full calendar days from `fromIso` to `toIso` (inclusive span offset: same day → 0). */
export function diffCalendarDaysIso(fromIso: string, toIso: string): number {
  const a = fromIso.slice(0, 10);
  const b = toIso.slice(0, 10);
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  const u1 = Date.UTC(y1, m1 - 1, d1);
  const u2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((u2 - u1) / 86400000);
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
