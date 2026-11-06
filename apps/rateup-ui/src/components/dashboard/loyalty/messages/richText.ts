/**
 * `LoyaltyWaCommand.content` is a rich-text document (the editor's JSON). The Messages page
 * edits plain text: one paragraph per line on the way in, one line per block on the way out.
 */
export interface RichTextDoc {
  type: "doc";
  content: Array<{ type: "paragraph"; content: Array<{ type: "text"; text: string }> }>;
}

export function toRichText(text: string): RichTextDoc {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line.length > 0 ? [{ type: "text", text: line }] : [],
    })),
  };
}

export function plainTextFromRichText(content: unknown): string {
  const collect = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const record = node as { text?: unknown; content?: unknown };
    if (typeof record.text === "string") return record.text;
    return Array.isArray(record.content) ? record.content.map(collect).join("") : "";
  };
  if (typeof content === "string") return content;
  const nodes = Array.isArray(content)
    ? content
    : ((content as { content?: unknown } | null)?.content ?? []);
  return Array.isArray(nodes) ? nodes.map(collect).join("\n").replace(/\n+$/, "") : "";
}
