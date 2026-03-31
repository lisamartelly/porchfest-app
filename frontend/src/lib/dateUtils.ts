/**
 * Safely parse a date string avoiding the UTC timezone shift problem.
 *
 * Date-only strings ("2026-03-31") and full ISO timestamps at midnight UTC
 * ("2026-03-31T00:00:00.000Z") both suffer from the same issue: converting
 * to a local timezone behind UTC shifts the calendar day back by one.
 *
 * We extract the YYYY-MM-DD portion and re-parse at noon local time, which
 * keeps the calendar date stable in any timezone from UTC-12 to UTC+14.
 */
export function parseLocalDate(dateStr: string): Date {
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return new Date(match[1] + "T12:00:00");
  }
  return new Date(dateStr);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return parseLocalDate(dateStr).toLocaleDateString();
}

/**
 * Extract a YYYY-MM-DD value for <input type="date"> without going
 * through toISOString() (which converts to UTC and can shift the day).
 */
export function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }
  const d = parseLocalDate(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
