import { FastifyInstance } from "fastify";
import {
  deleteUploadedFileController,
  uploadController,
} from "./fileUpload.controller";
import { $Rref } from "./fileUpload.schema";
import FastifyMultipart from "@fastify/multipart";

export async function fileUploadPublicRoutes(server: FastifyInstance) {
  server.register(FastifyMultipart);
  server.post(
    "/file",
    {
    //   schema: {
    //     body: $Rref("uploadFileSchema"),
    //   }

    //TODO - fix schema for file upload
    },
    uploadController
  );
  server.put(
    "/file/delete",
    {
      schema: {
        body: $Rref("fileDeleteInputSchema"),
      },
    },
    deleteUploadedFileController
  );
}
