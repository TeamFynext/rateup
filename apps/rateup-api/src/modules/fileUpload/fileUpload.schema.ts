import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

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
];
export const dataExtractFileMimeTypes = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const uploadFileSchema = z.object({
  file: z.any().refine((value) => allowedMimeTypes.includes(value), {
    message: "Invalid file format",
    path: ["file"],
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

export const { schemas: uploadSchemas, $ref: $Iref } = buildJsonSchemas(
  {
    uploadFileSchema,
    fileDeleteInputSchema,
  },
  { $id: "uploadSchema" },
);

export type UploadFileInput = z.infer<typeof uploadFileSchema>;

export type fileDeleteInput = z.infer<typeof fileDeleteInputSchema>;
