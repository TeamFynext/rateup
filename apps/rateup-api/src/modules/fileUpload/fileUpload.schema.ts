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

const uploadFileSchema = z.object({
  file: z.any().refine((value) => allowedMimeTypes.includes(value), {
    path: ["file"],
    error: "Invalid file format",
  }),
});

const fileDeleteInputSchema = z.object({
  fileKeyArray: z
    .array(
      z.object({
        Key: z.string().trim().min(1),
      }),
    )
    .min(1),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;

export type fileDeleteInput = z.infer<typeof fileDeleteInputSchema>;

// Auto-exported after fastify-zod migration
export { uploadFileSchema, fileDeleteInputSchema };
