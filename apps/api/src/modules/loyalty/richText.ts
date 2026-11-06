/**
 * The rich-text documents loyalty keyword replies are stored as (`LoyaltyWaCommand.content`,
 * a ProseMirror/TipTap-style tree), and the two conversions every sender needs: filling the
 * `{{n}}` variables and flattening to the plain string a WhatsApp text message carries.
 *
 * Pure functions, in their own module so the account service (which sends the welcome)
 * and the settings service (which answers keywords) can both use them without importing
 * each other.
 */

type RichTextInput = string | RichTextNode | RichTextNode[] | null | undefined;

/**
 * `content` is the loyaltyWaCommand's raw `Json?` column: a rich-text document that is
 * either the document node itself (`{ content: [...] }`) or already the node array.
 */
export function replacedContentByDynamicVariable(
  content: RichTextInput,
  dynamicVariables: (string | number)[],
): RichTextNode[] {
  const contentArray: RichTextNode[] = Array.isArray(content)
    ? content
    : typeof content === "string"
      ? []
      : (content?.content ?? []);
  const contentCopy = structuredClone(contentArray);
  for (const para of contentCopy) {
    const contents = para.content;
    if (contents) {
      for (const content of contents) {
        if (content.text) {
          content.text = content.text.replace(/\{\{(\d+)\}\}/g, (_: string, index: string) =>
            String(dynamicVariables[Number(index) - 1] ?? `{{${index}}}`),
          );
        }
      }
    }
  }
  return contentCopy;
}

/**
 * WhatsApp text messages carry a plain string, but loyalty command bodies are stored as
 * rich-text documents. Flatten to text (one line per top-level block) before sending —
 * passing the node array straight through rendered as "[object Object]".
 */
export function richTextToPlainText(content: RichTextInput): string {
  // Older rows store the body as a plain string rather than a rich-text document.
  if (typeof content === "string") return content;
  const nodes = Array.isArray(content) ? content : (content?.content ?? []);
  return nodes
    .map((node) => collectText(node))
    .filter((line) => line.length > 0)
    .join("\n");
}

function collectText(node: RichTextNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map((child) => collectText(child)).join("");
}

/** A reply's text, with its variables filled, ready to send as a WhatsApp text message. */
export function renderReplyText(content: RichTextInput, dynamicVariables: (string | number)[]) {
  if (typeof content === "string") {
    return content.replace(/\{\{(\d+)\}\}/g, (_: string, index: string) =>
      String(dynamicVariables[Number(index) - 1] ?? `{{${index}}}`),
    );
  }
  return richTextToPlainText(replacedContentByDynamicVariable(content, dynamicVariables));
}

/**
 * Plain text → the stored document shape. One paragraph per line, so a two-line reply
 * round-trips through `richTextToPlainText` unchanged.
 */
export function toRichText(text: string): RichTextNode {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line.length > 0 ? [{ type: "text", text: line }] : [],
    })),
  };
}
