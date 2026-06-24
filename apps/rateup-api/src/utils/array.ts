export function arrayEquals(a: Array<string>, b: Array<string>) {
  if (a.length !== b.length) return false;
  return a.every((val, _index) => b.includes(val));
}
/**
 * Parse a string of comma separated values into an array of strings
 *
 * Elements should not contain commas
 * @param str
 * @returns Array<string>
 */
export function parseArrayString(str: string): Array<string> {
  if (!str) return [];
  return str.split(",").map((s) => s.trim());
}
