import { FastifyInstance } from "fastify";
import {
  createTemplateHandler,
  deleteTemplateHandler,
  getTemplateByIdHandler,
  getTemplatesHandler,
  getUnregisteredTemplatesHandler,
  registerTemplatesInDbHandler,
  saveTemplateAsDraftHandler,
  sendTemplateToUserHandler,
  syncTemplatesHandler,
  updateTemplateHandler,
  uploadHandler,
} from "./wa_templates.controller";
import { $WTref } from "./wa_templates.schema";
import { checkSession } from "../../../utils/checkSession";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import fastifyMultipart from "@fastify/multipart";
import { verifyMessageMonthlyLimitRestriction } from "./wa_templates.auth";
import { verifyTemplateSubscriptionLimit } from "./wa_templates.utils";

export async function waTemplatesRoutes(server: FastifyInstance) {
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 50,
    },
    throwFileSizeLimit: true,
  });
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([
      SubscriptionFeaturePathName.WhatsAppTemplate,
    ]),
  );

  server.get(
    "/",
    {
      schema: {
        querystring: $WTref("templateTypeParamsSchema"),
      },
    },
    getTemplatesHandler,
  );
  server.get(
    "/:templateId",
    {
      schema: {
        params: $WTref("byTemplateIdParamsSchema"),
      },
    },
    getTemplateByIdHandler,
  );

  server.post(
    "/",
    {
      // preHandler: verifyTemplateSubscriptionLimit,
      schema: {
        body: $WTref("waTemplateInputSchema"),
      },
    },
    createTemplateHandler,
  );
  server.post(
    "/save-as-draft",
    {
      // preHandler: verifyTemplateSubscriptionLimit,
      schema: {
        body: $WTref("waTemplateInputSchema"),
      },
    },
    saveTemplateAsDraftHandler,
  );

  server.put(
    "/:templateId",
    {
      schema: {
        params: $WTref("byTemplateIdParamsSchema"),
        body: $WTref("waTemplateInputSchema"),
      },
    },
    updateTemplateHandler,
  );
  server.delete(
    "/:templateId",
    {
      schema: {
        params: $WTref("byTemplateIdParamsSchema"),
      },
    },
    deleteTemplateHandler,
  );

  server.get("/sync", syncTemplatesHandler);

  server.get("/unregistered", getUnregisteredTemplatesHandler);
  server.post("/register", registerTemplatesInDbHandler);
  server.post(
    "/upload",
    {
      schema: {
        consumes: ["multipart/form-data"],
      },
    },
    uploadHandler,
  );

  server.post(
    "/:templateId/send",
    {
      preHandler: verifyMessageMonthlyLimitRestriction,
      schema: {
        params: $WTref("byTemplateIdParamsSchema"),
        body: $WTref("waUserSendTemplateBodySchema"),
      },
    },
    sendTemplateToUserHandler,
  );
}
