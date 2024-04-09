import { FastifyInstance } from "fastify";
import { uploadInvoiceDataHandler } from "./myg.controller";
import { $MYGRef } from "./myg.schema";

export async function mygRoutes(server: FastifyInstance) {
  server.addHook("preValidation", async (request, reply) => {
    if (typeof request.body === "string") {
      // Replace single quotes with double quotes
      request.body = JSON.parse(request.body.replace(/'/g, '"'));
    }
  });
  server.post(
    "/upload-invoicedata",
    {
      schema: {
        body: $MYGRef("uploadInvoiceDataRequestSchema"),
      },
    },
    uploadInvoiceDataHandler,
  );
}

//MYG
