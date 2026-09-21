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
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import fastifyMultipart from "@fastify/multipart";
import {
  type ByTemplateIdParamsSchema,
  byTemplateIdParamsSchema,
  syncTemplatesSchema,
  templateTypeParamsSchema,
  waTemplateInputSchema,
  type WaUserSendTemplateBodySchema,
  waUserSendTemplateBodySchema,
} from "./wa_templates.schema.js";
import { declareAccess } from "../../../authz/registry.js";

export async function waTemplatesRoutes(server: FastifyInstance) {
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 100,
    },
    throwFileSizeLimit: true,
  });
  declareAccess(server, { read: "templates.read", write: "templates.manage" });
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Whatsapp]),
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
      schema: {
        body: waTemplateInputSchema,
      },
    },
    createTemplateHandler,
  );
  server.post(
    "/save-as-draft",
    {
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
      config: { permission: "templates.sync" },
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

  server.post<{ Params: ByTemplateIdParamsSchema; Body: WaUserSendTemplateBodySchema }>(
    "/:templateId/send",
    {
      config: { permission: "inbox.reply" },
      schema: {
        params: byTemplateIdParamsSchema,
        body: waUserSendTemplateBodySchema,
      },
    },
    sendTemplateToUserHandler,
  );
}
