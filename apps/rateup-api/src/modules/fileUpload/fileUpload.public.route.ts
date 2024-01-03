import { FastifyInstance } from "fastify";
import {
  deleteUploadedFileController,
  uploadController,
} from "./fileUpload.controller";
import { $Iref } from "./fileUpload.schema";
import FastifyMultipart from "@fastify/multipart";

export async function fileUploadPublicRoutes(server: FastifyInstance) {
  server.register(FastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
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
