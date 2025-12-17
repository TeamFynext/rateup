import { FastifyInstance } from "fastify";
import {
  deleteUploadedFileController,
  uploadController,
  uploadWithThumbnailsController,
} from "./fileUpload.controller.js";
import { $Iref } from "./fileUpload.schema.js";
import FastifyMultipart from "@fastify/multipart";

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

  server.put(
    "/file/delete",
    {
      schema: {
        body: $Iref("fileDeleteInputSchema"),
      },
    },
    deleteUploadedFileController,
  );
}
