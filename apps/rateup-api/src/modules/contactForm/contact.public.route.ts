import { FastifyInstance } from "fastify";
import { $Cref } from "./contact.schema.js";
import { createContactMsgHandler } from "./contact.controller.js";

export async function contactFormPublicRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $Cref("createContactMessageInputSchema"),
      },
    },
    createContactMsgHandler,
  );
}
