import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/ogg"
  ];
  

//   export const uploadFileSchema = z.object({
//     file: z.string().nullable().refine(value => allowedMimeTypes.includes(value?.mimetype), {
//       message: "Invalid file format",
//       path: ["file"]
//     }),
//   });
  
export const uploadFileSchema = z.object({
  file: z.any().refine(value => allowedMimeTypes.includes(value), {
    message: "Invalid file format",
    path: ["file"]
  }),
});
  

export const { schemas: uploadSchemas, $ref: $Rref } = buildJsonSchemas({
    uploadFileSchema
},
{ $id: "uploadSchema" }
);

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
