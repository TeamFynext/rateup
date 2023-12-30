import { FastifyInstance } from "fastify";
import {
  createTemplateHandler,
  deleteTemplateHandler,
  getTemplatesHandler,
  getUnregisteredTemplatesHandler,
  registerTemplatesInDbHandler,
  syncTemplatesHandler,
  updateTemplateHandler,
} from "./wa_templates.controller";
import { $WTref } from "./wa_templates.schema";
import { checkSession } from "../../../utils/checkSession";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { getVerifySubscriptionHandler } from "../../../utils/auth";

export async function waTemplatesRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([
      SubscriptionFeaturePathName.WhatsAppCampaign,
    ]),
  );

  server.get("/", getTemplatesHandler);

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
}
