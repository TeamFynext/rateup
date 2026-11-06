import { MessagePlatform } from "@/constants/enums";

export type AttachmentKind = "image" | "video" | "audio" | "document";

/** A file on the device, ready to be checked and uploaded as an attachment. */
export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number | null;
  kind: AttachmentKind;
};

const MB = 1024 * 1024;

/**
 * Largest file each platform accepts, per kind. A file over the limit is refused by the
 * platform only after it is uploaded and the send is attempted, so it is caught here instead.
 * WhatsApp: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#supported-media-types
 */
const LIMITS: Record<"whatsapp" | "other", Record<AttachmentKind, number>> = {
  whatsapp: { image: 5 * MB, video: 16 * MB, audio: 16 * MB, document: 100 * MB },
  other: { image: 8 * MB, video: 25 * MB, audio: 25 * MB, document: 25 * MB },
};

export function attachmentLimit(kind: AttachmentKind, platform?: string) {
  return LIMITS[platform === MessagePlatform.WHATSAPP ? "whatsapp" : "other"][kind];
}

/** `null` when the file can be sent; otherwise the reason it can't, ready for a toast. */
export function attachmentSizeError(
  file: { name: string; size?: number | null },
  kind: AttachmentKind,
  platform?: string,
): string | null {
  const limit = attachmentLimit(kind, platform);
  if (!file.size || file.size <= limit) return null;
  return `"${file.name}" is ${formatSize(file.size)}. ${capitalize(kind)}s can be up to ${formatSize(limit)}.`;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  "3gp": "video/3gpp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  amr: "audio/amr",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/**
 * Non-standard names phones give common types, mapped to the ones the API accepts. An
 * iPhone Voice Memo is `audio/x-m4a`, and older Android reports `.m4a` as
 * `audio/mp4a-latm`; the API knows both only as `audio/mp4` and would refuse them.
 */
const MIME_ALIASES: Record<string, string> = {
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/mp4a-latm": "audio/mp4",
  "audio/x-mp4": "audio/mp4",
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/mpeg3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/x-aac": "audio/aac",
  "audio/opus": "audio/ogg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "application/x-pdf": "application/pdf",
};

/** The picker's MIME type, else one guessed from the file name, in the API's spelling. */
export function resolveMimeType(name: string, mimeType?: string | null) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const type = mimeType?.toLowerCase() || MIME_BY_EXTENSION[ext] || "application/octet-stream";
  return MIME_ALIASES[type] ?? type;
}

/**
 * Audio and document types the API accepts, which are WhatsApp's: the same list as
 * `mimeTypeMaxSizes` in rateup-api `src/utils/upload/validate.ts`. Photos and videos are
 * not listed: the picker and the API convert them.
 */
const SENDABLE: Partial<Record<AttachmentKind, { types: string[]; label: string }>> = {
  audio: {
    types: ["audio/aac", "audio/amr", "audio/mpeg", "audio/mp4", "audio/ogg"],
    label: "MP3, M4A, AAC, AMR or OGG",
  },
  document: {
    types: [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    label: "PDF, Word, Excel, PowerPoint or TXT",
  },
};

/** Instagram and Messenger send a document as a file attachment, which they take as a PDF. */
const SEND_API_DOCUMENT = { types: ["application/pdf"], label: "PDF" };

/** `null` when the API will take the file's type; otherwise why not, ready for a toast. */
export function attachmentTypeError(
  file: {
    name: string;
    mimeType: string;
    kind: AttachmentKind;
  },
  platform?: string,
) {
  const sendApi =
    !!platform && (platform === MessagePlatform.INSTAGRAM || platform === MessagePlatform.FACEBOOK);
  const rule = file.kind === "document" && sendApi ? SEND_API_DOCUMENT : SENDABLE[file.kind];
  if (!rule || rule.types.includes(file.mimeType)) return null;
  return `"${file.name}" can't be sent. ${capitalize(file.kind)} files must be ${rule.label}.`;
}

/**
 * The message kind a gallery or camera asset is sent as. A Live Photo is sent as its
 * still image; anything else the picker can return is an image or a video.
 */
export function galleryAssetKind(asset: { type?: string | null; mimeType?: string | null }) {
  if (asset.type === "video" || asset.mimeType?.startsWith("video/")) return "video";
  return "image";
}

/**
 * The name an asset is uploaded under. The extension is the uploaded file's own: iOS
 * re-encodes a HEIC photo to JPEG but still reports `IMG_0001.HEIC` as its name. The
 * camera, and some Android galleries, give no name at all.
 */
export function galleryAssetName(
  asset: { fileName?: string | null; uri: string },
  kind: "image" | "video",
) {
  const fromUri = asset.uri.split("/").pop()?.split("?")[0] ?? "";
  const dot = fromUri.lastIndexOf(".");
  const ext = dot > 0 ? fromUri.slice(dot + 1) : kind === "video" ? "mp4" : "jpg";
  const base = asset.fileName?.replace(/\.[^.]+$/, "") || `${kind}-${Date.now()}`;
  return `${base}.${ext}`;
}

function formatSize(bytes: number) {
  return bytes >= MB
    ? `${Math.round((bytes / MB) * 10) / 10} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

function capitalize(text: string) {
  return text[0].toUpperCase() + text.slice(1);
}

/** The message kind a file shared in from another app is sent as, from its MIME type. */
export function sharedFileKind(mimeType: string): AttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

/** Android's share intent can hand over a bare path; uploads need a `file://` uri. */
export function toFileUri(path: string) {
  return path.startsWith("/") ? `file://${path}` : path;
}
