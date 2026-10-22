/**
 * DOM-free building blocks shared by the HTML sanitisers (`sanitizeHtml.ts` for org-authored
 * rich text, `sanitizeCmsHtml.ts` for Ghost posts). Nothing here imports DOMPurify, so the
 * marketing bundle can use it without pulling that in.
 */

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const SAFE_MEDIA_PROTOCOLS = new Set(["http:", "https:"]);
/** Hosts the tiptap YouTube extension embeds from. Any other iframe loses its `src`. */
const EMBED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "player.vimeo.com",
]);
// Only used to resolve relative URLs so their protocol can be read; never navigated to.
const URL_BASE = "https://base.invalid/";

function parseUrl(value: string): URL | null {
  try {
    return new URL(value.trim(), URL_BASE);
  } catch {
    return null;
  }
}

/** `href` values a sanitised link may keep: http(s), mailto, tel, and relative URLs. */
export function isSafeLinkHref(href: string): boolean {
  const url = parseUrl(href);
  return url !== null && SAFE_LINK_PROTOCOLS.has(url.protocol);
}

/** `src` values an `<img>`/`<video>` may keep (data: images are allowed separately by DOMPurify). */
export function isSafeMediaSrc(src: string): boolean {
  const url = parseUrl(src);
  return url !== null && SAFE_MEDIA_PROTOCOLS.has(url.protocol);
}

/** `src` values an `<iframe>` may keep: https embeds from known video hosts only. */
export function isAllowedEmbedSrc(src: string): boolean {
  const url = parseUrl(src);
  return url !== null && url.protocol === "https:" && EMBED_HOSTS.has(url.hostname);
}

export const ENTITY_MAP: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x"))
      return safeFromCodePoint(Number.parseInt(lower.slice(2), 16), match);
    if (lower.startsWith("#")) return safeFromCodePoint(Number.parseInt(lower.slice(1), 10), match);
    return ENTITY_MAP[lower] ?? match;
  });
}

function safeFromCodePoint(codePoint: number, fallback: string): string {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return fallback;
  return String.fromCodePoint(codePoint);
}

/**
 * Text content of an HTML string without a DOM. The result is plain text: it must be rendered
 * as a React text child (or escaped with `escapeHtml`), never injected as HTML.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  const withoutRawText = html.replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, "");
  const withBreaks = withoutRawText.replace(
    /<\s*(br|\/p|\/div|\/li|\/h[1-6]|\/blockquote|\/pre)\b[^>]*>/gi,
    " ",
  );
  const withoutTags = withBreaks.replace(/<[^>]*>?/g, "");
  return decodeEntities(withoutTags).replace(/\s+/g, " ").trim();
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
