import { MultipartFile } from "@fastify/multipart";

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
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    100 * 1024 * 1024,
  "application/msword": 100 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    100 * 1024 * 1024,
  "application/vnd.ms-powerpoint": 100 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    100 * 1024 * 1024,
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
  const size: number = data.fields.size?.["value"] || 0;
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
