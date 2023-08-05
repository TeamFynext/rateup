import { FastifyInstance } from "fastify";
import { uploadController } from "./fileUpload.controller";
import { $Rref } from "./fileUpload.schema";

const fmp = require('fastify-multipart');

export async function fileUploadPublicRoutes(server: FastifyInstance) { 

  server.register(fmp);

  server.post(
    "/file",
    {
    //   schema: {
    //     body: $Rref("uploadFileSchema"),
    //   }

    //TODO - fix schema for file upload
    },
    uploadController
  )
}