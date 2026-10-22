/**
 * A stored or third-party URL as an `href`, or undefined unless it is http(s). The API already
 * refuses other schemes; this keeps old rows and Meta-supplied links from ever becoming
 * `javascript:` or `data:` links should React stop blocking them.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}
