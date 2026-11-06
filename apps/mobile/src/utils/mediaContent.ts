/**
 * Media messages are stored as one string, `<id>_caption_<caption>` — or, for a document,
 * `<id>_caption_<filename>_caption_<caption>` (src/api/inbox/messages/utils.ts). Both the
 * filename and the caption are chosen by the customer.
 */
export const MEDIA_CONTENT_SEPARATOR = "_caption_";

/**
 * Splits on the separator into at most `parts` pieces. The last piece keeps any further
 * separators, so a caption that happens to contain `_caption_` survives whole instead of
 * being cut off.
 */
export function splitMediaContent(content: string | null | undefined, parts: number): string[] {
  const pieces = (content ?? "").split(MEDIA_CONTENT_SEPARATOR);
  if (pieces.length <= parts) return pieces;
  return [...pieces.slice(0, parts - 1), pieces.slice(parts - 1).join(MEDIA_CONTENT_SEPARATOR)];
}

/** A media id (or the URL of one we sent) reduced to characters that are safe in a filename. */
export function safeMediaId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-]/g, "_");
}

const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "rtf",
  "txt",
  "csv",
  "zip",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "mp3",
  "m4a",
  "ogg",
  "mp4",
]);

/**
 * The file name a downloaded document is written under: the media id plus an extension
 * from a fixed list. Never the customer's filename, which could hold `../` and point the
 * write at the app's own databases. The extension is kept so the viewer the OS picks can
 * open the file; anything not on the list becomes `.bin`.
 */
export function documentStorageName(id: string, filename: string | undefined): string {
  const match = /\.([a-zA-Z0-9]{1,5})$/.exec(filename ?? "");
  const ext = match?.[1].toLowerCase();
  return `${safeMediaId(id)}.${ext && DOCUMENT_EXTENSIONS.has(ext) ? ext : "bin"}`;
}

/**
 * A document message's parts. `filename` is for display only. The ingest path writes the
 * literal string "undefined" when WhatsApp sent no filename.
 */
export function parseDocumentContent(content: string | null | undefined) {
  const [id = "", rawFilename = "", caption = ""] = splitMediaContent(content, 3);
  const filename = rawFilename && rawFilename !== "undefined" ? rawFilename : "document.pdf";
  return { id, filename, caption, storageName: documentStorageName(id, filename) };
}
