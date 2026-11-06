/**
 * A date of birth, typed rather than picked.
 *
 * The web uses a calendar popover. A wheel or calendar on a phone is the wrong control for
 * a birthday — reaching 1972 is a long scroll while a customer waits — and the app has no
 * date picker dependency, so this is a numeric field that formats itself as `DD/MM/YYYY`.
 *
 * Everything here is pure so the parsing is testable: it is the one field on the register
 * form that can be wrong in a way nobody notices until a birthday message goes out on the
 * wrong day.
 */

/** Digits as typed → `DD/MM/YYYY`, inserting the slashes as they are reached. */
export function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter((part) => part.length > 0).join("/");
}

/**
 * `DD/MM/YYYY` → `YYYY-MM-DD`, or `null` when it is not a real past date.
 *
 * A calendar date, never `toISOString()`: a birthday picked as local midnight serialises to
 * the previous day for anyone east of Greenwich, which is exactly how a birthday message
 * lands 24 hours early.
 */
export function parseDob(display: string, now = new Date()): string | null {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  if (month < 1 || month > 12 || day < 1) return null;
  if (year < 1900 || year > now.getFullYear()) return null;
  // Rejects 31 February rather than rolling it into March, which `new Date` would do.
  if (day > daysInMonth(year, month)) return null;

  const date = new Date(year, month - 1, day);
  if (date > now) return null;

  return `${year}-${pad(month)}-${pad(day)}`;
}

/** An ISO timestamp or `YYYY-MM-DD` from the API → what the field shows. */
export function dobToDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
