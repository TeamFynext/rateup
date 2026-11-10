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
} from "./templates.controller.js";
import { SubscriptionFeaturePathName } from "../../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../../utils/auth.js";
import fastifyMultipart from "@fastify/multipart";
import {
  type ByTemplateIdParamsSchema,
  byTemplateIdParamsSchema,
  registerTemplatesInDbBodySchema,
  syncTemplatesSchema,
  templateTypeParamsSchema,
  waTemplateInputSchema,
  type WaUserSendTemplateBodySchema,
  waUserSendTemplateBodySchema,
} from "./templates.schema.js";
import { declareAccess } from "../../../../authz/registry.js";
import {
  enableTemplateInsightsHandler,
  getTemplateAnalyticsHandler,
  getTemplateInsightsStatusHandler,
} from "./templateAnalytics.controller.js";
import {
  type TemplateAnalyticsAccount,
  templateAnalyticsAccountSchema,
  type TemplateAnalyticsQuery,
  templateAnalyticsQuerySchema,
} from "./templateAnalytics.schema.js";
import {
  createTemplateFromLibraryHandler,
  getTemplateLibraryHandler,
} from "./templateLibrary.controller.js";
import {
  type CreateFromLibraryInput,
  createFromLibrarySchema,
  type TemplateLibraryQuery,
  templateLibraryQuerySchema,
} from "./templateLibrary.schema.js";

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
  // Meta's template library. Registered before `/:templateId`, though Fastify would
  // prefer the static path anyway.
  server.get<{ Querystring: TemplateLibraryQuery }>(
    "/library",
    { schema: { querystring: templateLibraryQuerySchema } },
    getTemplateLibraryHandler,
  );
  server.post<{ Body: CreateFromLibraryInput }>(
    "/library",
    { schema: { body: createFromLibrarySchema } },
    createTemplateFromLibraryHandler,
  );

  // Meta's per-template analytics (sent, delivered, read, button clicks, cost).
  server.get<{ Querystring: TemplateAnalyticsQuery }>(
    "/analytics",
    { schema: { querystring: templateAnalyticsQuerySchema } },
    getTemplateAnalyticsHandler,
  );
  server.get<{ Querystring: TemplateAnalyticsAccount }>(
    "/analytics/status",
    { schema: { querystring: templateAnalyticsAccountSchema } },
    getTemplateInsightsStatusHandler,
  );
  // Permanent on Meta's side and account-wide, so it is a channel setting.
  server.post<{ Body: TemplateAnalyticsAccount }>(
    "/analytics/enable",
    {
      schema: { body: templateAnalyticsAccountSchema },
      config: { permission: "channels.manage" },
    },
    enableTemplateInsightsHandler,
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
  server.post(
    "/register",
    { schema: { body: registerTemplatesInDbBodySchema } },
    registerTemplatesInDbHandler,
  );
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
