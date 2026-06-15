import { FastifyInstance } from "fastify";
import {
  createWaSettingsHandler,
  deleteWaSettingsHandler,
  getMetaAssetsHandler,
  getMetaDatasetsHandler,
  getWaLogsHandler,
  getWaSettingsForOrgHandler,
  getWaSettingsHandler,
  subscribeFieldstoPageHandler,
  syncAdAccountsHandler,
  syncAdsByAdAccountHandler,
  syncFbPagesHandler,
  syncLeadgenFormQuestionsHandler,
  syncLeadgenFormsHandler,
  updateWaSettingsByIdHandler,
  upsertWaSettingsHandler,
} from "./wa_settings.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import {
  byAdAccountIdParamsSchema,
  byFbPageQuerySchema,
  byLeadGenFormIdParamsSchema,
  byWaSettingsIdParamsSchema,
  createWaSettingsInputSchema,
  paginationQuery,
  updateWaSettingsInputSchema,
  whatsappSettingsIdParamSchema,
} from "./wa_settings.schema.js";

export async function waSettingsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
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

  server.get(
    "/logs",
    {
      schema: {
        querystring: paginationQuery,
      },
    },
    getWaLogsHandler,
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
}
