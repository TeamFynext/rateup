import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import parse from "html-react-parser";
import React from "react";
import type { ReactNode } from "react";

/**
 * WhatsApp text-format helpers shared by every inlined WA editor and by the
 * message renderers. Kept separate so the parsing rules live in one place.
 */

/**
 * Collect the user ids of every mention node in a tiptap doc. Sent alongside a
 * private note so the backend resolves mentions by id (robust to names that
 * contain spaces, which the text-based `@name` extraction can't match).
 */
export function extractMentionUserIds(editorContent: unknown): string[] {
  const ids = new Set<string>();
  const walk = (node) => {
    if (!node) return;
    if (node.type === "mention" && node.attrs?.id) ids.add(String(node.attrs.id));
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(editorContent);
  return Array.from(ids);
}

/**
 * `editorContent` is the editor's Tiptap document. Callers hold it in a field
 * typed loosely (it round-trips through the message body), and guard against
 * empty values before calling — an empty value has no `content` and would throw,
 * exactly as before.
 */
export function parseToWhatsAppFormat(editorContent: TiptapNode | string) {
  function formatText(text: string, type = "*") {
    const trimmedEnd = text.trimEnd();
    const trimmedStart = text.trimStart();
    const trimmed = text.trim();

    const leadingSpaces = " ".repeat(text.length - trimmedStart.length);
    const trailingSpaces = " ".repeat(text.length - trimmedEnd.length);
    const formattedText = trailingSpaces.length > 0 ? `${type}${trailingSpaces}${type}` : "";
    return `${leadingSpaces}${type}${trimmed}${type}${formattedText}`;
  }
  const parseNode = (node: TiptapNode): string => {
    if (!node) return "";
    switch (node.type) {
      case "paragraph":
        return node?.content?.map(parseNode).join("") ?? "";
      case "text":
        let text = node.text ?? "";
        if (node.marks) {
          node.marks.forEach((mark: { type: string }) => {
            switch (mark.type) {
              case "bold":
                text = formatText(text, "*");
                break;
              case "italic":
                text = formatText(text, "_");
                break;
              case "strike":
                text = formatText(text, "~");
                break;
              case "code":
                text = `\`${text}\``;
                break;
              default:
                break;
            }
          });
        }
        return text;
      case "bulletList":
        return node.content?.map((item: TiptapNode) => `* ${parseNode(item)}`).join("\n") ?? "";
      case "orderedList":
        return (
          node.content
            ?.map((item: TiptapNode, index: number) => `${index + 1}. ${parseNode(item)}`)
            .join("\n") ?? ""
        );
      case "blockquote":
        return node.content?.map((item: TiptapNode) => `> ${parseNode(item)}`).join("\n") ?? "";
      case "codeBlock":
        return `\`\`\`${node.content?.map(parseNode).join("") ?? ""}\`\`\``;
      case "listItem":
        return node.content?.map(parseNode).join("") ?? "";
      case "mention":
        return `@${node.attrs?.label ?? node.attrs?.id ?? ""}`;
      default:
        return "";
    }
  };

  return (editorContent as TiptapNode).content?.map(parseNode).join("\n") ?? "";
}
/** A node of a Tiptap document, as the WhatsApp editor produces it. */
export interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  marks?: { type: string }[];
  text?: string;
  /** Node attributes, e.g. a mention's label/id. */
  attrs?: Record<string, string | number | boolean | null | undefined>;
}

export function parseFromWhatsAppFormat(text: string): {
  type: "doc";
  content: TiptapNode[];
} {
  // Helper to create text node with marks
  const createTextNode = (text: string, marks: string[] = []): TiptapNode => ({
    type: "text",
    text,
    ...(marks.length && { marks: marks.map((type) => ({ type })) }),
  });

  const paragraphs = text.split("\n\n");
  const content: TiptapNode[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;

    const paragraphNode: TiptapNode = {
      type: "paragraph",
      content: [],
    };

    let currentIndex = 0;
    let currentText = "";
    const activeMarks: string[] = [];

    while (currentIndex < paragraph.length) {
      const char = paragraph[currentIndex];

      // Handle WhatsApp style formatting
      switch (char) {
        case "*": {
          // Check if it's opening or closing bold
          const isClosing = activeMarks.includes("bold");
          if (currentText) {
            paragraphNode.content?.push(createTextNode(currentText, [...activeMarks]));
            currentText = "";
          }
          if (isClosing) {
            activeMarks.splice(activeMarks.indexOf("bold"), 1);
          } else {
            activeMarks.push("bold");
          }
          break;
        }
        case "_": {
          // Check for italic
          const isClosing = activeMarks.includes("italic");
          if (currentText) {
            paragraphNode.content?.push(createTextNode(currentText, [...activeMarks]));
            currentText = "";
          }
          if (isClosing) {
            activeMarks.splice(activeMarks.indexOf("italic"), 1);
          } else {
            activeMarks.push("italic");
          }
          break;
        }
        case "~": {
          // Check for strikethrough
          const isClosing = activeMarks.includes("strike");
          if (currentText) {
            paragraphNode.content?.push(createTextNode(currentText, [...activeMarks]));
            currentText = "";
          }
          if (isClosing) {
            activeMarks.splice(activeMarks.indexOf("strike"), 1);
          } else {
            activeMarks.push("strike");
          }
          break;
        }
        case "`": {
          // Check for code
          const isClosing = activeMarks.includes("code");
          if (currentText) {
            paragraphNode.content?.push(createTextNode(currentText, [...activeMarks]));
            currentText = "";
          }
          if (isClosing) {
            activeMarks.splice(activeMarks.indexOf("code"), 1);
          } else {
            activeMarks.push("code");
          }
          break;
        }
        default:
          currentText += char;
      }

      currentIndex++;
    }

    // Add any remaining text
    if (currentText) {
      paragraphNode.content?.push(createTextNode(currentText, [...activeMarks]));
    }

    // Add paragraph if it has content
    if (paragraphNode.content?.length) {
      content.push(paragraphNode);
    }
  }

  return {
    type: "doc",
    content,
  };
}

export function parseWhatsAppToReact(text: string): React.ReactNode {
  const parseNode = (node: TiptapNode): React.ReactNode => {
    if (!node) return null;
    switch (node.type) {
      case "paragraph":
        return <p>{node.content?.map(parseNode)}</p>;
      case "text":
        const text = node.text;
        if (node.marks) {
          return node.marks.reduce<ReactNode>((acc, mark) => {
            switch (mark.type) {
              case "bold":
                return <strong>{acc}</strong>;
              case "italic":
                return <em>{acc}</em>;
              case "strike":
                return <s>{acc}</s>;
              case "code":
                return <code>{acc}</code>;
              default:
                return acc;
            }
          }, text);
        }
        return text;
      case "bulletList":
        return (
          <ul>
            {node.content?.map((item, index) => (
              <li key={index}>{parseNode(item)}</li>
            ))}
          </ul>
        );
      case "orderedList":
        return (
          <ol>
            {node.content?.map((item, index) => (
              <li key={index}>{parseNode(item)}</li>
            ))}
          </ol>
        );
      case "blockquote":
        return <blockquote>{node.content?.map(parseNode)}</blockquote>;
      case "codeBlock":
        return (
          <pre>
            <code>{node.content?.map(parseNode)}</code>
          </pre>
        );
      case "listItem":
        return node.content?.map(parseNode);
      default:
        return null;
    }
  };

  const parsedContent = parseFromWhatsAppFormat(text);
  return parsedContent.content.map((node, index) => (
    <React.Fragment key={index}>{parseNode(node)}</React.Fragment>
  ));
}

export function parseJsonToReact(value: string | TiptapNode) {
  if (typeof value === "string") return value;
  if (!value?.content?.[0]?.content) return "";
  return parse(generateHTML(value, [StarterKit]));
}

export function whatsappToHTML(text: string) {
  if (!text) return "";

  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  html = html
    // Bold (*text*)
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
    // Italic (_text_)
    .replace(/_(.*?)_/g, "<em>$1</em>")
    // Strikethrough (~text~)
    .replace(/~(.*?)~/g, "<s>$1</s>")
    // Inline code (`code`)
    .replace(/`(.*?)`/g, "<code>$1</code>");

  // Alignment markers
  html = html
    .replace(/\[center\]([\s\S]*?)(?=\[|$)/g, '<div style="text-align:center;">$1</div>')
    .replace(/\[right\]([\s\S]*?)(?=\[|$)/g, '<div style="text-align:right;">$1</div>')
    .replace(/\[left\]([\s\S]*?)(?=\[|$)/g, '<div style="text-align:left;">$1</div>');

  // --- Handle checkboxes / bullets / numbered lists ---
  html = html.replace(/(^|\\n)[\s]*[☑☐]\s?(.*?)(?=\\n|$)/g, "$1<div>☐ $2</div>");

  // Replace lines that start with "-" or "*" or "•"
  html = html.replace(/(^|\\n)[\s]*[-*•]\s+(.*?)(?=\\n|$)/g, "$1<div>• $2</div>");

  // Replace numbered list lines "1. text"
  html = html.replace(/(^|\\n)[\s]*\d+\.\s+(.*?)(?=\\n|$)/g, "$1<div>$2</div>");

  // --- Paragraphs & line breaks ---
  // Replace escaped newlines (\n or \\n) with <br>
  html = html.replace(/\\n|\\\\n|\n/g, "<br>");

  // Optional: convert multiple <br> sequences into paragraph breaks
  html = html.replace(/(<br>\s*){2,}/g, "</p><p>");

  return `<p style="font-size:0.875rem;line-spacing:1.25rem;">${html}</p>`;
}
