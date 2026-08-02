import { z } from "zod";
import { CSV_MIMETYPES, ODS_MIMETYPE } from "../../utils/spreadsheet.js";

export const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "application/svg+xml",
  "application/pdf",
  "audio/aac",
  "audio/amr",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "text/plain",
  "application/vnd.ms-excel",
  ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
export const dataExtractFileMimeTypes = [
  ...CSV_MIMETYPES,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ODS_MIMETYPE,
];

// uploadFileSchema used to live here: `z.any().refine(value =>
// allowedMimeTypes.includes(value))`, which compared the file VALUE against a list
// of mimetypes and so could never pass. No route used it, and it read as though
// upload validation were declarative when the real check is validateFile.
// Deleted. See issues.txt 24.8.

const fileDeleteInputSchema = z.object({
  fileKeyArray: z
    .array(
      z.object({
        Key: z.string().trim().min(1),
      }),
    )
    .min(1),
});

export type fileDeleteInput = z.infer<typeof fileDeleteInputSchema>;

// Auto-exported after fastify-zod migration
export { fileDeleteInputSchema };
