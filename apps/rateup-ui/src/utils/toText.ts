/**
 * Turns a value of unknown shape into text for display, search or a URL.
 *
 * Strings, numbers, booleans and bigints read as `String()` would. `null` and `undefined` become
 * `fallback`. Arrays join their items with commas, as `String()` would. Other objects become JSON,
 * where `String()` would give "[object Object]", the bug this exists to stop.
 */
export function toText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map((item) => toText(item)).join(",");
  if (value instanceof Date) return value.toString();
  if (typeof value === "symbol") return value.description ?? "";
  if (typeof value === "function") return "";
  try {
    return JSON.stringify(value) ?? fallback;
  } catch {
    return fallback;
  }
}
