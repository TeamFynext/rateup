/**
 * `postMessage` origins Meta's embedded-signup popup can post from: `https://facebook.com` or
 * any `https://*.facebook.com`. Compared on the parsed hostname — a suffix check on the raw
 * origin string also accepts `https://evilfacebook.com`.
 */
export function isFacebookOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return url.hostname === "facebook.com" || url.hostname.endsWith(".facebook.com");
}
