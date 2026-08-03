import { FastifyInstance } from "fastify";
import { createContactMsgHandler } from "./contact.controller.js";
import { createContactMessageInputSchema } from "./contact.schema.js";

export async function contactFormPublicRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: createContactMessageInputSchema,
      },
    },
    createContactMsgHandler,
  );
}
