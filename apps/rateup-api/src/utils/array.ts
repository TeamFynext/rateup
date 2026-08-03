/**
 * True when both lists hold the same members the same number of times, order aside.
 *
 * Compares sorted copies rather than asking "is every member of a somewhere in b" —
 * that test was duplicate-blind and asymmetric, answering true for
 * (["a","a"], ["a","b"]) but false for the same pair swapped.
 */
export function arrayEquals(a: Array<string>, b: Array<string>) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
}
/**
 * Parse a string of comma separated values into an array of strings
 *
 * Elements should not contain commas
 * @param str
 * @returns Array<string>
 */
export function parseArrayString(str: string | undefined): Array<string> {
  if (!str) return [];
  // Empties dropped: the sole caller turns each element into a RegExp for the CORS
  // whitelist, and a trailing comma yielded `new RegExp("")` — a pattern that matches
  // every origin.
  return str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
}
