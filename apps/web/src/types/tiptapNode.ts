/**
 * A Tiptap document node as the WhatsApp editor stores it. Lives here rather than in the
 * editor so `src/store` and `src/backend` can name it without importing the UI layer.
 */
export interface TiptapNode {
  /** Optional so a `JSONContent` straight out of the editor satisfies this. */
  type?: string;
  content?: TiptapNode[];
  marks?: { type: string }[];
  text?: string;
  /** Node attributes, e.g. a mention's label/id. */
  attrs?: Record<string, string | number | boolean | null | undefined>;
}
