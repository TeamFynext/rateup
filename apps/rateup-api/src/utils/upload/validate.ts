import { Multipart, MultipartFile } from "@fastify/multipart";

/// Multipart non-file fields (`type: "field"`) carry a `.value`; file parts and
/// `undefined` don't. Only the first entry is used for repeated field names,
/// matching the pre-existing behaviour of the CSV import handlers.
export function getMultipartFieldValue(field: Multipart | Multipart[] | undefined): unknown {
  const part = Array.isArray(field) ? field[0] : field;
  return part?.type === "field" ? part.value : undefined;
}

const mimeTypeMaxSizes: Record<string, number> = {
  // Audio
  "audio/aac": 16 * 1024 * 1024,
  "audio/amr": 16 * 1024 * 1024,
  "audio/mpeg": 16 * 1024 * 1024,
  "audio/mp4": 16 * 1024 * 1024,
  "audio/ogg": 16 * 1024 * 1024,
  // Document
  "text/plain": 100 * 1024 * 1024,
  "application/vnd.ms-excel": 100 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 100 * 1024 * 1024,
  "application/msword": 100 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 100 * 1024 * 1024,
  "application/vnd.ms-powerpoint": 100 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": 100 * 1024 * 1024,
  "application/pdf": 100 * 1024 * 1024,
  // Image
  "image/jpeg": 5 * 1024 * 1024,
  "image/png": 5 * 1024 * 1024,
  // Sticker
  "image/webp": 500 * 1024,
  // Video
  "video/3gpp": 16 * 1024 * 1024,
  "video/mp4": 16 * 1024 * 1024,
};

export function validateFile({
  data,
  allowAll = false,
}: {
  data: MultipartFile;
  allowAll?: boolean;
}): {
  valid: boolean;
  message?: string;
  maxSize?: number;
} {
  if (allowAll) {
    return { valid: true };
  }
  const maxSize = mimeTypeMaxSizes?.[data?.mimetype];
  if (!maxSize) {
    return { valid: false, message: "Unsupported file type." };
  }
  if (data?.file?.truncated) {
    return { valid: false, message: "File size exceeds server limit." };
  }
  const sizeField = Array.isArray(data.fields.size) ? data.fields.size[0] : data.fields.size;
  // Read `.value` structurally rather than gating on `type === "field"`: this is a size
  // *limit* check, and any part shape missing that discriminant would otherwise fall back
  // to 0 — silently meaning "unlimited" and letting oversized uploads through.
  const size: number = Number(sizeField && "value" in sizeField ? sizeField.value : 0) || 0;
  if (size > maxSize) {
    return {
      valid: false,
      message: `File size exceeds for this type.`,
      maxSize,
    };
  }
  const validKeys = Object.keys(mimeTypeMaxSizes);
  if (!validKeys.includes(data?.mimetype) || data.type !== "file") {
    return { valid: false, message: "This file type is not permitted." };
  }
  return { valid: true, maxSize };
}
