import { createElement, type ReactNode } from "react";

/**
 * WhatsApp markup (`*bold*`, `_italic_`, `~strike~`, `` `code` ``, ```` ```mono``` ````) as
 * React elements, for the support widget. The app's `wa-editor/format.tsx` does the same through
 * tiptap, which is ~100 KB gzipped the marketing site should not pay for a chat bubble.
 */

const INLINE_TAGS: Record<string, "strong" | "em" | "s" | "code"> = {
  "*": "strong",
  _: "em",
  "~": "s",
  "`": "code",
};

const WORD_CHAR = /[\p{L}\p{N}_]/u;
const SPACE = /\s/;

/* WhatsApp's own rule: a marker opens only at a word boundary and before a non-space, and
   closes after a non-space on the same line — so `snake_case` and a lone `*` stay literal. */
function findClose(text: string, open: number, marker: string) {
  if (open > 0 && WORD_CHAR.test(text[open - 1])) return -1;
  const first = text[open + 1];
  if (first === undefined || SPACE.test(first)) return -1;

  for (let i = open + 2; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") return -1;
    if (ch !== marker || SPACE.test(text[i - 1])) continue;
    const after = text[i + 1];
    if (after === undefined || !WORD_CHAR.test(after)) return i;
  }
  return -1;
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let plain = "";
  const flush = () => {
    if (plain) out.push(plain);
    plain = "";
  };

  let i = 0;
  while (i < text.length) {
    if (text.startsWith("```", i)) {
      const close = text.indexOf("```", i + 3);
      if (close > i + 3) {
        flush();
        out.push(createElement("code", { key: out.length }, text.slice(i + 3, close)));
        i = close + 3;
        continue;
      }
    }

    const ch = text[i];
    const tag = INLINE_TAGS[ch];
    const close = tag ? findClose(text, i, ch) : -1;
    if (tag && close !== -1) {
      flush();
      const inner = text.slice(i + 1, close);
      out.push(
        createElement(tag, { key: out.length }, tag === "code" ? inner : renderInline(inner)),
      );
      i = close + 1;
      continue;
    }

    if (ch === "\n") {
      flush();
      out.push(createElement("br", { key: out.length }));
    } else {
      plain += ch;
    }
    i++;
  }
  flush();
  return out;
}

/** One `<p>` per blank-line-separated paragraph, `<br>` for a single line break. */
export function renderWhatsAppMarkup(text: string): ReactNode {
  return text
    .split(/\n[^\S\n]*\n\s*/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph, index) => <p key={index}>{renderInline(paragraph)}</p>);
}
