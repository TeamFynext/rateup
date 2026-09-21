import { FastifyInstance } from "fastify";
import {
  getOrCreateContactHandler,
  sendSupportEmailHandler,
  supportUserWebhookEventHandler,
} from "./support-user.controller.js";
import { supportEmailSchema, type SupportEmailInput } from "./support-user.schema.js";
import { rateLimit } from "../../../utils/rateLimit.js";
import { getChatByContactId } from "../inbox/message/wamessage.service.js";
import { verifyApiAccessTokenHook } from "../../apiAccessToken/apiAccessToken.auth.js";
import { type ByContactIdParams, byContactIdSchema } from "../../contact/contact.schema.js";
import type { ByOrgIdParams } from "../../org/org.schema.js";
import { declareAccess } from "../../../authz/registry.js";

export async function supportUserWebhookRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "token" });
  // TODO: implement challanges for webhook
  // server.get("/", webhookSubscribeHandler);
  server.post("/", { preHandler: verifyApiAccessTokenHook }, supportUserWebhookEventHandler);

  // `verifyApiAccessTokenHook` resolves the org from `?orgId=` when the path has no
  // `:orgId`, so the querystring is part of this route's contract.
  server.get<{ Params: ByContactIdParams; Querystring: Partial<ByOrgIdParams> }>(
    "/contact/:contactId",
    {
      preHandler: verifyApiAccessTokenHook,
      schema: {
        params: byContactIdSchema,
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

  // The widget's Email tab. Rate limited ahead of the token check: the widget runs on a public
  // page, so its token is public too and cannot be the only thing standing in front of a mailer.
  server.post<{ Body: SupportEmailInput }>(
    "/email",
    {
      preHandler: [
        rateLimit({ max: 5, windowSeconds: 60 * 60, key: "supportWidgetEmail" }),
        verifyApiAccessTokenHook,
      ],
      schema: {
        body: supportEmailSchema,
      },
    },
    sendSupportEmailHandler,
  );
}
