/**
 * Normalise a `?returnTo=` value to a same-origin path, or `/`.
 *
 * Browsers treat `\` as `/` in special-scheme URLs and drop tab/newline characters, so
 * `/\evil.com` or `/\t/evil.com` both resolve to `//evil.com` — a protocol-relative URL on
 * another host. Anything with a backslash or control character is refused outright, and what
 * is left must still resolve to the console's own origin.
 */
export function safeReturnTo(value: string | undefined, origin = currentOrigin()): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  // oxlint-disable-next-line no-control-regex -- matching control characters is the point.
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return "/";
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return "/";
  }
  if (url.origin !== new URL(origin).origin) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

function currentOrigin(): string {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}
