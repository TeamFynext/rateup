/**
 * The absolute http(s) URL in `value`, or `null`. For redirects to stored, tenant-supplied
 * destinations (QR short links): `javascript:`, `data:` and the like must never reach
 * `window.location`.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
