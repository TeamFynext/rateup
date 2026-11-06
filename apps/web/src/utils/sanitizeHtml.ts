import DOMPurify from "dompurify";
import type { Config, DOMPurify as DOMPurifyInstance } from "dompurify";

import {
  escapeHtml,
  htmlToPlainText,
  isAllowedEmbedSrc,
  isSafeLinkHref,
  isSafeMediaSrc,
} from "./htmlSafety.ts";

/**
 * Sanitiser for org-authored rich text (survey question / welcome / language / thank-you
 * titles, theme previews, template cards). Those strings come from the tiptap editors in
 * `components/RichTextEditor` and are stored verbatim by the API, so every render site must
 * pass them through here before `dangerouslySetInnerHTML` — prefer the `SafeHtml` component,
 * which also handles SSR.
 *
 * DOMPurify needs a DOM. On the server (and in the node test environment) there is none, so
 * `sanitizeRichText` falls back to the escaped plain text of the input: still safe to inject,
 * just unformatted. `SafeHtml` renders that plain text on the server *and* during hydration,
 * then swaps in the sanitised HTML, so server and first client render are identical.
 */

/** Tags the survey rich-text editors can produce (StarterKit, text-style, image, video, youtube). */
export const RICH_TEXT_ALLOWED_TAGS = [
  "p",
  "span",
  "div",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "video",
  "iframe",
] as const;

export const RICH_TEXT_ALLOWED_ATTR = [
  "style",
  "class",
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "controls",
  "allowfullscreen",
  "data-youtube-video",
] as const;

const RICH_TEXT_CONFIG: Config = {
  ALLOWED_TAGS: [...RICH_TEXT_ALLOWED_TAGS],
  ALLOWED_ATTR: [...RICH_TEXT_ALLOWED_ATTR],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  FORBID_TAGS: ["script", "style", "form", "input", "button", "textarea", "select", "object"],
  FORBID_ATTR: ["srcdoc", "formaction", "xlink:href", "action"],
};

function hardenElement(node: Element): void {
  const tag = node.tagName.toLowerCase();

  const href = node.getAttribute("href");
  if (href !== null && !isSafeLinkHref(href)) node.removeAttribute("href");

  const src = node.getAttribute("src");
  if (src !== null) {
    const allowed =
      tag === "iframe"
        ? isAllowedEmbedSrc(src)
        : isSafeMediaSrc(src) || (tag === "img" && /^data:image\//i.test(src.trim()));
    if (!allowed) node.removeAttribute("src");
  }

  if (tag === "a") {
    const target = node.getAttribute("target");
    if (target !== null && target !== "_blank" && target !== "_self")
      node.removeAttribute("target");
    node.setAttribute("rel", "noopener noreferrer");
  } else {
    node.removeAttribute("target");
    node.removeAttribute("rel");
  }
}

let purifier: DOMPurifyInstance | null = null;

function getPurifier(): DOMPurifyInstance | null {
  if (typeof window === "undefined") return null;
  if (purifier) return purifier;
  // A dedicated instance so these hooks don't leak into other DOMPurify callers (CustomHTML).
  const instance = DOMPurify(window);
  if (!instance.isSupported) return null;
  instance.addHook("afterSanitizeAttributes", hardenElement);
  purifier = instance;
  return purifier;
}

/**
 * Sanitise org-authored rich text for `dangerouslySetInnerHTML`. Always returns a string that
 * is safe to inject; without a DOM it is the escaped plain text of the input.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  const instance = getPurifier();
  if (!instance) return escapeHtml(htmlToPlainText(html));
  return instance.sanitize(html, { ...RICH_TEXT_CONFIG, RETURN_TRUSTED_TYPE: false });
}
