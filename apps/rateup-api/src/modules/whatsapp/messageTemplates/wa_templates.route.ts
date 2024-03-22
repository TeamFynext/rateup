import { FastifyInstance } from "fastify";
import {
  createTemplateHandler,
  deleteTemplateHandler,
  getTemplateByIdHandler,
  getTemplatesHandler,
  getUnregisteredTemplatesHandler,
  registerTemplatesInDbHandler,
  syncTemplatesHandler,
  updateTemplateHandler,
  uploadHandler,
} from "./wa_templates.controller";
import { $WTref } from "./wa_templates.schema";
import { checkSession } from "../../../utils/checkSession";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import fastifyMultipart from "@fastify/multipart";

export async function waTemplatesRoutes(server: FastifyInstance) {
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([
      SubscriptionFeaturePathName.WhatsAppCampaign,
    ]),
  );

  server.get("/", getTemplatesHandler);
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
      schema: {
        body: $WTref("waTemplateInputSchema"),
      },
    },
    createTemplateHandler,
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
}
