import { FastifyInstance } from "fastify";
import { createContactMsgHandler } from "./contact.controller.js";
import { createContactMessageInputSchema, CreateContactMessageInput } from "./contact.schema.js";
import { rateLimit } from "../../utils/rateLimit.js";

/**
 * The marketing site's "contact us" form.
 *
 * NOT REGISTERED: nothing in registerRoutes.ts mounts this plugin, so the endpoint
 * does not exist at runtime. It is kept, and kept correct, so wiring it up is a
 * one-line change rather than a one-line change plus the defects section 22 lists.
 * See issues.txt 22.1.
 *
 * The per-IP limit is the one the other public marketing forms use (issues.txt
 * 16.2): five an hour is generous for a human filling in a form once and retrying
 * after a typo, and useless as a flooding tool. Without it the honeypot would be
 * the only abuse control. See issues.txt 22.7.
 */
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
