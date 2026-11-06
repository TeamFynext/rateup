/**
 * Write-time sanitiser for org-authored survey rich text (question titles in every language,
 * welcome / thank-you / language page `titleText` and `subtitleText`, theme titles).
 *
 * Those strings come from the dashboard's tiptap editors and are rendered with
 * `dangerouslySetInnerHTML` on the public survey pages (rateup.app/ws/<id>). rateup-ui sanitises
 * them again at render with DOMPurify (`src/utils/sanitizeHtml.ts`); this is the server-side half,
 * so nothing executable is ever stored. The allow-list mirrors rateup-ui's
 * `RICH_TEXT_ALLOWED_TAGS` / `RICH_TEXT_ALLOWED_ATTR`, and the approach is a port of rateup-ui's
 * DOM-free `sanitizeCmsHtml`.
 *
 * It does not filter the input; it re-serialises it. The input is tokenised into text, start
 * tags and end tags, and the output is rebuilt from scratch: only allow-listed tags and
 * attributes are written, attribute values are re-quoted and escaped, every `<` in text is
 * escaped, and open tags are closed. Anything the tokeniser does not recognise as a tag is
 * written out as escaped text, so a tokeniser/browser disagreement can garble content but cannot
 * introduce markup that was not explicitly emitted here.
 *
 * Text other than `<` is left exactly as written (`&`, `>`, quotes, entity references), so plain
 * text without a `<` passes through unchanged, and the function is idempotent: sanitising its
 * own output returns the same string.
 */

type AttrRule = (value: string) => boolean;

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const SAFE_MEDIA_PROTOCOLS = new Set(["http:", "https:"]);
/** Hosts the tiptap YouTube extension embeds from (same list as rateup-ui's htmlSafety.ts). */
const EMBED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "player.vimeo.com",
]);
// Only used to resolve relative URLs so their protocol can be read; never fetched.
const URL_BASE = "https://base.invalid/";

function parseUrl(value: string): URL | null {
  try {
    return new URL(value.trim(), URL_BASE);
  } catch {
    return null;
  }
}

/** `href` values a link may keep: http(s), mailto, tel, and relative URLs. */
export function isSafeLinkHref(href: string): boolean {
  const url = parseUrl(href);
  return url !== null && SAFE_LINK_PROTOCOLS.has(url.protocol);
}

/** `src` values an `<img>` / `<video>` may keep (data: images are allowed separately). */
export function isSafeMediaSrc(src: string): boolean {
  const url = parseUrl(src);
  return url !== null && SAFE_MEDIA_PROTOCOLS.has(url.protocol);
}

/** `src` values an `<iframe>` may keep: https embeds from known video hosts only. */
export function isAllowedEmbedSrc(src: string): boolean {
  const url = parseUrl(src);
  return url !== null && url.protocol === "https:" && EMBED_HOSTS.has(url.hostname);
}

/** Inline images pasted into the editor. `<img>` never runs script, SVG included. */
const DATA_IMAGE = /^data:image\/(png|gif|jpe?g|webp|avif|bmp|svg\+xml)[;,]/i;

const ENTITY_MAP: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  colon: ":",
  tab: "\t",
  newline: "\n",
};

function safeFromCodePoint(codePoint: number, fallback: string): string {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return fallback;
  return String.fromCodePoint(codePoint);
}

/** Decode the character references a browser would decode in an attribute value. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);?/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x"))
      return safeFromCodePoint(Number.parseInt(lower.slice(2), 16), match);
    if (lower.startsWith("#")) return safeFromCodePoint(Number.parseInt(lower.slice(1), 10), match);
    return match.endsWith(";") ? (ENTITY_MAP[lower] ?? match) : match;
  });
}

const anyValue: AttrRule = () => true;
const isSize: AttrRule = (value) => /^(\d{1,5}(\.\d{1,3})?(px|%)?|auto)$/i.test(value.trim());
/** CSS that only ever did something harmful (old IE expressions, XBL, script URLs). */
const isSafeStyle: AttrRule = (value) =>
  !/expression\s*\(|javascript\s*:|vbscript\s*:|-moz-binding|behavior\s*:|@import/i.test(
    // CSS escapes (`\6a avascript:`) and comments could hide the keywords; check without them.
    value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\\/g, ""),
  );

const GLOBAL_ATTRS: Readonly<Record<string, AttrRule>> = {
  class: anyValue,
  title: anyValue,
  style: isSafeStyle,
};

const SIZE_ATTRS: Readonly<Record<string, AttrRule>> = { width: isSize, height: isSize };

/** Tag → attributes (beyond the global ones) it may keep. Mirrors rateup-ui's rich-text config. */
const RICH_TEXT_ALLOWED: Readonly<Record<string, Readonly<Record<string, AttrRule>>>> = {
  p: {},
  span: {},
  div: { "data-youtube-video": anyValue },
  br: {},
  hr: {},
  strong: {},
  b: {},
  em: {},
  i: {},
  u: {},
  s: {},
  strike: {},
  code: {},
  pre: {},
  blockquote: {},
  h1: {},
  h2: {},
  h3: {},
  h4: {},
  h5: {},
  h6: {},
  ul: {},
  ol: {},
  li: {},
  a: { href: isSafeLinkHref, target: (value) => value === "_blank" || value === "_self" },
  img: {
    src: (value) => isSafeMediaSrc(value) || DATA_IMAGE.test(value),
    alt: anyValue,
    ...SIZE_ATTRS,
  },
  video: { src: isSafeMediaSrc, controls: anyValue, ...SIZE_ATTRS },
  iframe: { src: isAllowedEmbedSrc, allowfullscreen: anyValue, ...SIZE_ATTRS },
};

export const RICH_TEXT_ALLOWED_TAGS: readonly string[] = Object.keys(RICH_TEXT_ALLOWED);

/** Attributes whose value is a URL: validated and written on the fully decoded value. */
const URL_ATTRS = new Set(["href", "src"]);
const VOID_TAGS = new Set(["br", "hr", "img"]);
/** Elements whose content is dropped entirely (raw text, or never displayable). */
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "template",
  "noscript",
  "textarea",
  "title",
  "xmp",
  "noembed",
  "noframes",
  "plaintext",
  "svg",
  "math",
  "object",
  "select",
  "button",
  "form",
]);

/** Escape for a double-quoted attribute value, keeping well-formed entity references. */
function escapeAttrKeepingEntities(text: string): string {
  return text
    .replace(/&(?!(#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape every special character, including `&` (for URL values, already decoded). */
function escapeAttrAll(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TAG_NAME = "[a-zA-Z][a-zA-Z0-9-]*";
const ATTRIBUTE = String.raw`([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?`;
// Sticky (`y`): matched in place at `lastIndex`, so the input is never re-sliced per tag.
const START_TAG = new RegExp(String.raw`<(${TAG_NAME})((?:\s+${ATTRIBUTE})*)\s*(/?)>`, "y");
const END_TAG = new RegExp(String.raw`</(${TAG_NAME})\s*>`, "y");
const ATTRIBUTE_GLOBAL = new RegExp(ATTRIBUTE, "g");

function serializeAttributes(tag: string, rawAttributes: string): string {
  const rules = RICH_TEXT_ALLOWED[tag] ?? {};
  const seen = new Set<string>();
  let out = "";
  for (const match of rawAttributes.matchAll(ATTRIBUTE_GLOBAL)) {
    const name = (match[1] ?? "").toLowerCase();
    if (seen.has(name)) continue;
    seen.add(name);
    const rule = rules[name] ?? GLOBAL_ATTRS[name];
    if (!rule) continue;
    const raw = match[2] ?? match[3] ?? match[4] ?? "";
    if (URL_ATTRS.has(name)) {
      // Validate exactly what the browser will see: decode, check, then escape everything.
      const decoded = decodeEntities(raw).trim();
      if (decoded === "" || !rule(decoded)) continue;
      out += ` ${name}="${escapeAttrAll(decoded)}"`;
    } else {
      if (!rule(decodeEntities(raw))) continue;
      out += ` ${name}="${escapeAttrKeepingEntities(raw)}"`;
    }
  }
  if (tag === "a") out += ' rel="noopener noreferrer"';
  return out;
}

/** Index just past the matching close tag of a raw-text/dropped element (or end of input). */
function skipElement(html: string, from: number, tag: string): number {
  const close = new RegExp(String.raw`</${tag}\s*>`, "gi");
  close.lastIndex = from;
  const match = close.exec(html);
  return match ? match.index + match[0].length : html.length;
}

/**
 * Sanitise one rich-text string. Non-strings pass through untouched so callers can map over
 * loosely-typed JSON without checking every value first.
 */
export function sanitizeRichText<T>(html: T): T {
  if (typeof html !== "string" || html === "") return html;
  const open: string[] = [];
  let out = "";
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    // Text runs contain no `<` by construction, and nothing else in HTML text can open markup,
    // so they are copied verbatim: `&`, `>`, quotes and entity references stay as written.
    if (lt === -1) {
      out += html.slice(i);
      break;
    }
    if (lt > i) out += html.slice(i, lt);
    i = lt;

    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", i) || html.startsWith("<?", i)) {
      const end = html.indexOf(">", i);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    END_TAG.lastIndex = i;
    const endTag = END_TAG.exec(html);
    if (endTag) {
      i += endTag[0].length;
      const tag = (endTag[1] ?? "").toLowerCase();
      const index = open.lastIndexOf(tag);
      if (index !== -1) {
        while (open.length > index) out += `</${open.pop()}>`;
      }
      continue;
    }

    START_TAG.lastIndex = i;
    const startTag = START_TAG.exec(html);
    if (startTag) {
      i += startTag[0].length;
      const tag = (startTag[1] ?? "").toLowerCase();
      const selfClosing = startTag[startTag.length - 1] === "/";
      if (DROP_WITH_CONTENT.has(tag)) {
        if (!selfClosing) i = skipElement(html, i, tag);
        continue;
      }
      if (!Object.hasOwn(RICH_TEXT_ALLOWED, tag)) continue;
      out += `<${tag}${serializeAttributes(tag, startTag[2] ?? "")}>`;
      if (tag === "iframe") {
        // iframe content is raw text in HTML and never shown; drop it and close the element.
        i = skipElement(html, i, tag);
        out += "</iframe>";
      } else if (VOID_TAGS.has(tag)) {
        // Nothing to close.
      } else if (selfClosing) {
        // `<p/>` is an open `<p>` to a browser; write it as the empty element it was meant as.
        out += `</${tag}>`;
      } else {
        open.push(tag);
      }
      continue;
    }

    // A `<` that does not start a recognisable tag is text.
    out += "&lt;";
    i += 1;
  }

  while (open.length > 0) out += `</${open.pop()}>`;
  return out as T;
}

/**
 * Neutralise markup in a string that is plain text (WhatsApp survey titles, which go out in
 * WhatsApp messages) but may still reach an HTML renderer. Only a `<` that would open a tag,
 * comment or end tag is escaped, so ordinary text such as `<3` or `a < b` is left alone and
 * nothing is HTML-escaped that a WhatsApp recipient would then see as `&amp;`.
 */
export function neutralizePlainText<T>(text: T): T {
  if (typeof text !== "string") return text;
  return text.replace(/<(?=[a-zA-Z!/?])/g, "&lt;") as T;
}
