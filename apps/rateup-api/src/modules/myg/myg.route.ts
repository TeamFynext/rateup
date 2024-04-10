import { FastifyInstance } from "fastify";
import {
  getInvoicesDataHandler,
  uploadInvoiceDataHandler,
} from "./myg.controller";
import { $MYGRef } from "./myg.schema";
import fastifyJwt from "@fastify/jwt";

export async function mygRoutes(server: FastifyInstance) {
  server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
  });

  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

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

  server.get("/invoices", getInvoicesDataHandler);
}

//MYG
