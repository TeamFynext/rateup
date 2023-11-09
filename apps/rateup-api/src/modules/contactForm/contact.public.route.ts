import { FastifyInstance } from "fastify";
import { $Cref } from "./contact.schema";
import { createContactMsgHandler } from "./contact.controller";

export async function contactFormPublicRoutes(server: FastifyInstance) { 
  server.post(
    "/",
    {
      schema: {
        body: $Cref("createContactMessageInputSchema"),
      }
    },
    createContactMsgHandler
  )

}