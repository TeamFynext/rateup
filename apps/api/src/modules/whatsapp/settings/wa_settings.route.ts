import { FastifyInstance } from "fastify";
import fastifyMultipart from "@fastify/multipart";
import {
  createWaSettingsHandler,
  getBusinessProfileHandler,
  deleteWaSettingsHandler,
  getConversationalAutomationHandler,
  syncConversationalAutomationHandler,
  getMetaAssetsHandler,
  getMetaDatasetsHandler,
  getWaSettingsForOrgHandler,
  getWaSettingsHandler,
  reRegisterPhoneNumberHandler,
  subscribeFieldstoPageHandler,
  syncDisplayNameHandler,
  updateBusinessProfileHandler,
  updateDisplayNameHandler,
  updateProfilePictureHandler,
  syncAdAccountsHandler,
  syncAdsByAdAccountHandler,
  syncFbPagesHandler,
  syncLeadgenFormQuestionsHandler,
  syncLeadgenFormsHandler,
  updateConversationalAutomationHandler,
  updateWaSettingsByIdHandler,
  upsertWaSettingsHandler,
} from "./wa_settings.controller.js";
import {
  businessProfileSchema,
  byAdAccountIdParamsSchema,
  byFbPageQuerySchema,
  byLeadGenFormIdParamsSchema,
  byWaSettingsIdParamsSchema,
  conversationalAutomationSchema,
  createWaSettingsInputSchema,
  paginationQuery,
  updateDisplayNameSchema,
  updateWaSettingsInputSchema,
  whatsappSettingsIdParamSchema,
} from "./wa_settings.schema.js";
import { declareAccess } from "../../../authz/registry.js";

export async function waSettingsRoutes(server: FastifyInstance) {
  // Registered per route scope, not globally — without this the profile photo upload is
  // rejected by the content-type parser before its handler ever runs. WhatsApp caps a
  // profile photo at 5 MB.
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 5,
    },
    throwFileSizeLimit: true,
  });
  declareAccess(server, { read: "channels.read", write: "channels.manage" });
  server.get("/", getWaSettingsHandler);
  server.post(
    "/",
    {
      schema: {
        body: createWaSettingsInputSchema,
      },
    },
    createWaSettingsHandler,
  );
  server.put(
    "/",
    {
      schema: {
        body: updateWaSettingsInputSchema,
      },
    },
    upsertWaSettingsHandler,
  );

  server.put(
    "/:whatsappSettingsId",
    {
      schema: {
        params: whatsappSettingsIdParamSchema,
        body: updateWaSettingsInputSchema,
      },
    },
    updateWaSettingsByIdHandler,
  );

  server.delete(
    "/:phoneId",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
      },
    },
    deleteWaSettingsHandler,
  );

  server.post("/sync/pages/:whatsappSettingsId", syncFbPagesHandler);

  server.post(
    "/sync/leadgen-forms/:whatsappSettingsId",
    {
      schema: {
        body: byFbPageQuerySchema,
      },
    },
    syncLeadgenFormsHandler,
  );

  server.post(
    "/sync/leadgen-form/:formId",
    {
      schema: {
        body: byFbPageQuerySchema,
        params: byLeadGenFormIdParamsSchema,
        querystring: whatsappSettingsIdParamSchema,
      },
    },
    syncLeadgenFormQuestionsHandler,
  );

  server.post("/sync/ad-accounts/:whatsappSettingsId", syncAdAccountsHandler);

  server.post(
    "/sync/ads/:adAccountId",
    {
      schema: {
        params: byAdAccountIdParamsSchema,
        querystring: whatsappSettingsIdParamSchema,
      },
    },
    syncAdsByAdAccountHandler,
  );

  server.post(
    "/subscribe/:whatsappSettingsId",
    {
      schema: {
        body: byFbPageQuerySchema,
        params: whatsappSettingsIdParamSchema,
      },
    },
    subscribeFieldstoPageHandler,
  );

  server.get("/meta-assets/:whatsappSettingsId", getMetaAssetsHandler);
  server.get(
    "/sync/datasets/:whatsappSettingsId",
    {
      schema: {
        params: whatsappSettingsIdParamSchema,
      },
    },
    getMetaDatasetsHandler,
  );
  server.get("/verification-status", getWaSettingsForOrgHandler);

  server.get(
    "/conversational-automation/:phoneId",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
      },
    },
    getConversationalAutomationHandler,
  );

  server.post(
    "/conversational-automation/:phoneId",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
        body: conversationalAutomationSchema,
      },
    },
    updateConversationalAutomationHandler,
  );

  server.post(
    "/conversational-automation/:phoneId/sync",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
      },
    },
    syncConversationalAutomationHandler,
  );

  server.post(
    "/display-name/:phoneId",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
        body: updateDisplayNameSchema,
      },
    },
    updateDisplayNameHandler,
  );

  server.post(
    "/display-name/:phoneId/sync",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
      },
    },
    syncDisplayNameHandler,
  );

  server.get(
    "/profile/:phoneId",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
      },
    },
    getBusinessProfileHandler,
  );

  server.post(
    "/profile/:phoneId",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
        body: businessProfileSchema,
      },
    },
    updateBusinessProfileHandler,
  );

  server.post(
    "/profile/:phoneId/photo",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
        consumes: ["multipart/form-data"],
      },
    },
    updateProfilePictureHandler,
  );

  server.post(
    "/display-name/:phoneId/register",
    {
      schema: {
        params: byWaSettingsIdParamsSchema,
      },
    },
    reRegisterPhoneNumberHandler,
  );
}
