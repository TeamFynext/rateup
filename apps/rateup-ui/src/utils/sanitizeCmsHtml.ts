import { decodeEntities, isAllowedEmbedSrc, isSafeLinkHref, isSafeMediaSrc } from "./htmlSafety.ts";

/**
 * DOM-free allow-list sanitiser for Ghost post HTML (`post.html`, `feature_image_caption`).
 *
 * Blog posts must render on the server (SEO), where DOMPurify has no DOM, and the same loader
 * runs again in the browser on client-side navigation — so this has to be a pure string
 * function that produces identical output in both places.
 *
 * It does not filter the input; it re-serialises it. The input is tokenised into text, start
 * tags and end tags, and the output is rebuilt from scratch: only allow-listed tags and
 * attributes are written, every attribute value is re-quoted and escaped, text is escaped, and
 * open tags are closed. Anything the tokeniser does not recognise as a tag is written out as
 * escaped text. A tokeniser/browser parsing disagreement can therefore garble content but
 * cannot introduce markup that was not explicitly emitted here.
 */

type AttrRule = (value: string) => boolean;

const anyValue: AttrRule = () => true;
const isDigits: AttrRule = (value) => /^\d{1,5}%?$/.test(value);
const isToken: AttrRule = (value) => /^[\w-]{1,100}$/.test(value);

function isSafeSrcset(value: string): boolean {
  const candidates = value.split(",").map((candidate) => candidate.trim());
  return candidates.every((candidate) => {
    const [url] = candidate.split(/\s+/);
    return url !== undefined && url !== "" && isSafeMediaSrc(url);
  });
}

const GLOBAL_ATTRS: Readonly<Record<string, AttrRule>> = {
  class: anyValue,
  title: anyValue,
  style: anyValue,
  dir: (value) => /^(ltr|rtl|auto)$/i.test(value),
  lang: isToken,
};

const MEDIA_SIZE_ATTRS: Readonly<Record<string, AttrRule>> = { width: isDigits, height: isDigits };

/** Tag → attributes (beyond the global ones) it may keep, each with a value check. */
const CMS_ALLOWED: Readonly<Record<string, Readonly<Record<string, AttrRule>>>> = {
  p: {},
  br: {},
  hr: {},
  h1: { id: isToken },
  h2: { id: isToken },
  h3: { id: isToken },
  h4: { id: isToken },
  h5: { id: isToken },
  h6: { id: isToken },
  strong: {},
  b: {},
  em: {},
  i: {},
  u: {},
  s: {},
  del: {},
  ins: {},
  mark: {},
  small: {},
  sub: {},
  sup: {},
  code: {},
  pre: {},
  kbd: {},
  blockquote: {},
  q: {},
  cite: {},
  ul: {},
  ol: { start: isDigits, type: (value) => /^[1aAiI]$/.test(value) },
  li: {},
  dl: {},
  dt: {},
  dd: {},
  div: {},
  span: {},
  section: {},
  details: { open: anyValue },
  summary: {},
  figure: {},
  figcaption: {},
  table: {},
  thead: {},
  tbody: {},
  tfoot: {},
  tr: {},
  th: { colspan: isDigits, rowspan: isDigits, scope: isToken },
  td: { colspan: isDigits, rowspan: isDigits },
  caption: {},
  colgroup: {},
  col: { span: isDigits },
  a: { href: isSafeLinkHref, target: (value) => value === "_blank" || value === "_self" },
  img: {
    src: (value) => isSafeMediaSrc(value) || /^data:image\/(png|gif|jpe?g|webp);/i.test(value),
    srcset: isSafeSrcset,
    sizes: anyValue,
    alt: anyValue,
    loading: (value) => value === "lazy" || value === "eager",
    ...MEDIA_SIZE_ATTRS,
  },
  picture: {},
  source: {
    src: isSafeMediaSrc,
    srcset: isSafeSrcset,
    type: anyValue,
    media: anyValue,
    sizes: anyValue,
  },
  video: {
    src: isSafeMediaSrc,
    poster: isSafeMediaSrc,
    loop: anyValue,
    muted: anyValue,
    playsinline: anyValue,
    preload: isToken,
    ...MEDIA_SIZE_ATTRS,
  },
  audio: { src: isSafeMediaSrc, loop: anyValue, preload: isToken },
  iframe: {
    src: isAllowedEmbedSrc,
    allow: anyValue,
    allowfullscreen: anyValue,
    frameborder: isDigits,
    loading: (value) => value === "lazy" || value === "eager",
    referrerpolicy: isToken,
    ...MEDIA_SIZE_ATTRS,
  },
};

/** Attributes whose value is a URL: validated and written on the fully decoded value. */
const URL_ATTRS = new Set(["href", "src", "srcset", "poster"]);
const VOID_TAGS = new Set(["br", "hr", "img", "source", "col"]);
/** Elements whose content is dropped entirely (raw text or never displayable). */
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
  "embed",
  "select",
  "button",
  "form",
]);

/** Escape for a text node or a double-quoted attribute, keeping well-formed entity refs. */
function escapeKeepingEntities(text: string): string {
  return text
    .replace(/&(?!(#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z\d]{1,31});)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape every special character, including `&` (for URL values, already decoded). */
function escapeAll(text: string): string {
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
  const rules = CMS_ALLOWED[tag] ?? {};
  const seen = new Set<string>();
  let out = "";
  for (const match of rawAttributes.matchAll(ATTRIBUTE_GLOBAL)) {
    const name = (match[1] ?? "").toLowerCase();
    if (seen.has(name)) continue;
    const rule = rules[name] ?? GLOBAL_ATTRS[name];
    if (!rule) continue;
    const raw = match[2] ?? match[3] ?? match[4] ?? "";
    seen.add(name);
    if (URL_ATTRS.has(name)) {
      // Validate exactly what the browser will see: decode, check, then escape everything.
      const decoded = decodeEntities(raw).trim();
      if (decoded === "" || !rule(decoded)) continue;
      out += ` ${name}="${escapeAll(decoded)}"`;
    } else {
      if (!rule(decodeEntities(raw))) continue;
      out += ` ${name}="${escapeKeepingEntities(raw)}"`;
    }
  }
  if (tag === "a") out += ' rel="noopener noreferrer"';
  if (tag === "video" || tag === "audio") out += ' controls=""';
  return out;
}

/** Index just past the matching close tag of a raw-text/dropped element (or end of input). */
function skipElement(html: string, from: number, tag: string): number {
  const close = new RegExp(String.raw`</${tag}\s*>`, "gi");
  close.lastIndex = from;
  const match = close.exec(html);
  return match ? match.index + match[0].length : html.length;
}

export function sanitizeCmsHtml(html: string | null | undefined): string {
  if (!html) return "";
  const open: string[] = [];
  let out = "";
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      out += escapeKeepingEntities(html.slice(i));
      break;
    }
    if (lt > i) out += escapeKeepingEntities(html.slice(i, lt));
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
      if (!(tag in CMS_ALLOWED)) continue;
      out += `<${tag}${serializeAttributes(tag, startTag[2] ?? "")}>`;
      if (tag === "iframe") {
        // iframe content is raw text in HTML and never shown; drop it and close the element.
        i = skipElement(html, i, tag);
        out += "</iframe>";
      } else if (!VOID_TAGS.has(tag) && !selfClosing) {
        open.push(tag);
      }
      continue;
    }

    // A `<` that does not start a recognisable tag is text.
    out += "&lt;";
    i += 1;
  }

  while (open.length > 0) out += `</${open.pop()}>`;
  return out;
}
