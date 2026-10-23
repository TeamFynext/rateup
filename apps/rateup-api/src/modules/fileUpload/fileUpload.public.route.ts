import { FastifyInstance } from "fastify";
import {
  deleteUploadedFileController,
  uploadController,
  uploadWithThumbnailsController,
} from "./fileUpload.controller.js";
import FastifyMultipart from "@fastify/multipart";
import { fileDeleteInputSchema, fileDeleteInput } from "./fileUpload.schema.js";
import { rateLimit } from "../../utils/rateLimit.js";

/**
 * Uploads stay under /api/public because anonymous survey respondents upload images and
 * files from a public form; the controller keys each object under its owner's org (the
 * session's, or the form link's) and refuses an anonymous upload that names no live form.
 * Deleting needs a session and only reaches the caller's own org's keys.
 */
export async function fileUploadPublicRoutes(server: FastifyInstance) {
  server.register(FastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 100,
      files: 1,
      fields: 10,
    },
    throwFileSizeLimit: true,
  });
  // Per client IP (request.ip honours trustProxy, not a raw header).
  const uploadLimit = rateLimit({ max: 120, windowSeconds: 10 * 60, key: "publicUpload" });
  server.post(
    "/file",
    {
      preHandler: [uploadLimit],
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
      preHandler: [uploadLimit],
      schema: {
        consumes: ["multipart/form-data"],
      },
    },
    uploadWithThumbnailsController,
  );

  server.put<{ Body: fileDeleteInput }>(
    "/file/delete",
    {
      // Overrides the public tagging of the /api/public prefix: authorize validates the
      // session and sets request.actor before the handler runs.
      config: { access: "session" },
      preHandler: [rateLimit({ max: 60, windowSeconds: 60 * 60, key: "fileDelete" })],
      schema: {
        body: fileDeleteInputSchema,
      },
    },
    deleteUploadedFileController,
  );
}
