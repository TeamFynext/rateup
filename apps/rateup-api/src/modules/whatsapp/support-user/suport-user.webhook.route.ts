import { FastifyInstance } from "fastify";
import {
  getOrCreateContactHandler,
  supportUserWebhookEventHandler,
} from "./support-user.controller.js";
import { getChatByContactId } from "../inbox/message/wamessage.service.js";
import { verifyApiAccessTokenHook } from "../../apiAccessToken/apiAccessToken.auth.js";

export async function supportUserWebhookRoutes(server: FastifyInstance) {
  // TODO: implement challanges for webhook
  // server.get("/", webhookSubscribeHandler);
  server.post(
    "/",
    { preHandler: verifyApiAccessTokenHook },
    supportUserWebhookEventHandler,
  );

  server.get(
    "/contact/:contactId",
    {
      preHandler: verifyApiAccessTokenHook,
      schema: {
        params: {
          type: "object",
          properties: {
            contactId: { type: "string", minLength: 1 },
          },
          required: ["contactId"],
        },
      },
    },
    getChatByContactId,
  );
  server.post(
    "/contact",
    {
      preHandler: verifyApiAccessTokenHook,
    },
    getOrCreateContactHandler,
  );
}
