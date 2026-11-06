type EditorNode = {
  type?: string;
  content?: EditorNode[];
  marks?: { type: string }[];
  text?: string;
  attrs?: Record<string, unknown>;
};

function wrap(text: string, symbol: string) {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const lead = text.slice(0, text.length - text.trimStart().length);
  const trail = text.slice(text.trimEnd().length);
  return `${lead}${symbol}${trimmed}${symbol}${trail}`;
}

function toText(node: EditorNode): string {
  switch (node.type) {
    case "paragraph":
    case "listItem":
      return node.content?.map(toText).join("") ?? "";
    case "text": {
      let text = node.text ?? "";
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") text = wrap(text, "*");
        else if (mark.type === "italic") text = wrap(text, "_");
        else if (mark.type === "strike") text = wrap(text, "~");
        else if (mark.type === "code") text = `\`${text}\``;
      }
      return text;
    }
    case "bulletList":
      return node.content?.map((item) => `* ${toText(item)}`).join("\n") ?? "";
    case "orderedList":
      return node.content?.map((item, i) => `${i + 1}. ${toText(item)}`).join("\n") ?? "";
    case "blockquote":
      return node.content?.map((item) => `> ${toText(item)}`).join("\n") ?? "";
    case "codeBlock":
      return `\`\`\`${node.content?.map(toText).join("") ?? ""}\`\`\``;
    case "mention":
      return `@${String(node.attrs?.label ?? node.attrs?.id ?? "")}`;
    default:
      return "";
  }
}

/**
 * A quick reply's text as WhatsApp-formatted plain text. The web saves it as its
 * editor's document (a JSON string); older replies are already plain text.
 * Mirrors `parseToWhatsAppFormat` in rateup-ui's `wa-editor/format.tsx`.
 */
export function quickReplyToWhatsAppText(text: string): string {
  if (!/^\s*\{.*\}\s*$/s.test(text)) return text;
  try {
    const doc = JSON.parse(text) as EditorNode;
    return doc.content?.map(toText).join("\n") ?? "";
  } catch {
    return text;
  }
}
