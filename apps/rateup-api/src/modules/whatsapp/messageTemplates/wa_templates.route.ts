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
} from "./wa_templates.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import fastifyMultipart from "@fastify/multipart";
import { verifyMessageMonthlyLimitRestriction } from "./wa_templates.auth.js";
import {
  byTemplateIdParamsSchema,
  syncTemplatesSchema,
  templateTypeParamsSchema,
  waTemplateInputSchema,
  waUserSendTemplateBodySchema,
} from "./wa_templates.schema.js";

export async function waTemplatesRoutes(server: FastifyInstance) {
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 100,
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
        querystring: templateTypeParamsSchema,
      },
    },
    getTemplatesHandler,
  );
  server.get(
    "/:templateId",
    {
      schema: {
        params: byTemplateIdParamsSchema,
      },
    },
    getTemplateByIdHandler,
  );

  server.post(
    "/",
    {
      // preHandler: verifyTemplateSubscriptionLimit,
      schema: {
        body: waTemplateInputSchema,
      },
    },
    createTemplateHandler,
  );
  server.post(
    "/save-as-draft",
    {
      // preHandler: verifyTemplateSubscriptionLimit,
      schema: {
        body: waTemplateInputSchema,
      },
    },
    saveTemplateAsDraftHandler,
  );

  server.put(
    "/:templateId",
    {
      schema: {
        params: byTemplateIdParamsSchema,
        body: waTemplateInputSchema,
      },
    },
    updateTemplateHandler,
  );
  server.delete(
    "/:templateId",
    {
      schema: {
        params: byTemplateIdParamsSchema,
      },
    },
    deleteTemplateHandler,
  );

  server.post(
    "/sync",
    {
      schema: {
        body: syncTemplatesSchema,
      },
    },
    syncTemplatesHandler,
  );

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
        params: byTemplateIdParamsSchema,
        body: waUserSendTemplateBodySchema,
      },
    },
    sendTemplateToUserHandler,
  );
}
