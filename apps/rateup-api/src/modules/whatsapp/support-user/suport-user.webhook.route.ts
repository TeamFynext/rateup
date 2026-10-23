import { FastifyInstance } from "fastify";
import {
  getOrCreateContactHandler,
  sendSupportEmailHandler,
  supportUserWebhookEventHandler,
} from "./support-user.controller.js";
import { supportEmailSchema, type SupportEmailInput } from "./support-user.schema.js";
import { rateLimit } from "../../../utils/rateLimit.js";
import { getChatByContactId } from "../inbox/message/wamessage.service.js";
import { verifyWidgetTokenHook } from "../../apiAccessToken/apiAccessToken.auth.js";
import { type ByContactIdParams, byContactIdSchema } from "../../contact/contact.schema.js";
import { declareAccess } from "../../../authz/registry.js";

/**
 * The embedded support widget's REST surface; every route here is the widget's (its chat
 * messages, contact card, history and Email tab). The key it sends is public — it ships in
 * the customer's page — so `verifyWidgetTokenHook` only takes a full-access key or one with
 * the Webchat widget feature.
 */
export async function supportUserWebhookRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "token" });
  // TODO: implement challanges for webhook
  // server.get("/", webhookSubscribeHandler);
  server.post("/", { preHandler: verifyWidgetTokenHook }, supportUserWebhookEventHandler);

  // The widget's key names the org; `verifyWidgetTokenHook` takes it from there.
  server.get<{ Params: ByContactIdParams }>(
    "/contact/:contactId",
    {
      preHandler: verifyWidgetTokenHook,
      schema: {
        params: byContactIdSchema,
      },
    },
    getChatByContactId,
  );
  server.post(
    "/contact",
    {
      preHandler: verifyWidgetTokenHook,
    },
    getOrCreateContactHandler,
  );

  // The widget's Email tab. Rate limited ahead of the token check: the widget runs on a public
  // page, so its token is public too and cannot be the only thing standing in front of a mailer.
  server.post<{ Body: SupportEmailInput }>(
    "/email",
    {
      preHandler: [
        rateLimit({ max: 5, windowSeconds: 60 * 60, key: "supportWidgetEmail" }),
        verifyWidgetTokenHook,
      ],
      schema: {
        body: supportEmailSchema,
      },
    },
    sendSupportEmailHandler,
  );
}
