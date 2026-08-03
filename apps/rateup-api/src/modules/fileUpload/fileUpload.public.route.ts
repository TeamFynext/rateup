import { FastifyInstance } from "fastify";
import {
  deleteUploadedFileController,
  uploadController,
  uploadWithThumbnailsController,
} from "./fileUpload.controller.js";
import FastifyMultipart from "@fastify/multipart";
import { fileDeleteInputSchema, fileDeleteInput } from "./fileUpload.schema.js";
import { rateLimit } from "../../utils/rateLimit.js";

export async function fileUploadPublicRoutes(server: FastifyInstance) {
  server.register(FastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 100,
    },
    throwFileSizeLimit: true,
  });
  server.post(
    "/file",
    {
      schema: {
        consumes: ["multipart/form-data"],
      },
      //TODO - fix schema for file upload
    },
    uploadController,
  );
  server.post(
    "/fileWithThumb",
    {
      schema: {
        consumes: ["multipart/form-data"],
      },
    },
    uploadWithThumbnailsController,
  );

  server.put<{ Body: fileDeleteInput }>(
    "/file/delete",
    {
      preHandler: [rateLimit({ max: 60, windowSeconds: 60 * 60, key: "fileDelete" })],
      schema: {
        body: fileDeleteInputSchema,
      },
    },
    deleteUploadedFileController,
  );
}
