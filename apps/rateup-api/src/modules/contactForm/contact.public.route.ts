import { FastifyInstance } from "fastify";
import { createContactMsgHandler } from "./contact.controller.js";
import { createContactMessageInputSchema, CreateContactMessageInput } from "./contact.schema.js";
import { rateLimit } from "../../utils/rateLimit.js";

export async function contactFormPublicRoutes(server: FastifyInstance) {
  server.post<{ Body: CreateContactMessageInput }>(
    "/",
    {
      preHandler: rateLimit({ max: 5, windowSeconds: 60 * 60, key: "contactForm" }),
      schema: {
        body: createContactMessageInputSchema,
      },
    },
    createContactMsgHandler,
  );
}
