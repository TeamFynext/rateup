import { FastifyInstance } from "fastify";
import {
  createWaSettingsHandler,
  deleteWaSettingsHandler,
  getContactTagHandler,
  getFbPagesFromMetaHandler,
  getMetaAssetsHandler,
  getWaLogsHandler,
  getWaSettingsHandler,
  subscribeFieldstoPageHandler,
  syncAdAccountsHandler,
  syncAdsByAdAccountHandler,
  syncFbPagesHandler,
  syncLeadgenFormQuestionsHandler,
  syncLeadgenFormsHandler,
  updateContactTagHandler,
  updateWaSettingsByIdHandler,
  upsertWaSettingsHandler,
} from "./wa_settings.controller";
import { $WASettingsref } from "./wa_settings.schema";
import { checkSession } from "../../../utils/checkSession";

export async function waSettingsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get(
    "/",
    {
      schema: {
        response: {
          200: $WASettingsref("getWaSettingsResponseSchema"),
        },
      },
    },
    getWaSettingsHandler,
  );
  server.post(
    "/",
    {
      schema: {
        body: $WASettingsref("createWaSettingsInputSchema"),
      },
    },
    createWaSettingsHandler,
  );
  server.put(
    "/",
    {
      schema: {
        body: $WASettingsref("updateWaSettingsInputSchema"),
      },
    },
    upsertWaSettingsHandler,
  );

  server.put(
    "/:settingsId",
    {
      schema: {
        params: $WASettingsref("whatsappSettingsIdParamSchema"),
        body: $WASettingsref("updateWaSettingsInputSchema"),
      },
    },
    updateWaSettingsByIdHandler,
  );

  server.delete(
    "/:phoneId",
    {
      schema: {
        params: $WASettingsref("byWaSettingsIdParamsSchema"),
      },
    },
    deleteWaSettingsHandler,
  );
  server.get("/contact_tag", getContactTagHandler);
  server.post(
    "/contact_tag",
    {
      schema: {
        body: $WASettingsref("contactTagSchema"),
      },
    },
    updateContactTagHandler,
  );
  server.get(
    "/logs",
    {
      schema: {
        querystring: $WASettingsref("paginationQuery"),
      },
    },
    getWaLogsHandler,
  );

  server.post("/sync/pages/:whatsappSettingsId", syncFbPagesHandler);

  server.post(
    "/sync/leadgen-forms/:whatsappSettingsId",
    {
      schema: {
        body: $WASettingsref("byFbPageQuerySchema"),
      },
    },
    syncLeadgenFormsHandler,
  );

  server.post(
    "/sync/leadgen-form/:formId",
    {
      schema: {
        body: $WASettingsref("byFbPageQuerySchema"),
        params: $WASettingsref("byLeadGenFormIdParamsSchema"),
        querystring: $WASettingsref("whatsappSettingsIdParamSchema"),
      },
    },
    syncLeadgenFormQuestionsHandler,
  );

  server.post("/sync/ad-accounts/:whatsappSettingsId", syncAdAccountsHandler);

  server.post(
    "/sync/ads/:adAccountId",
    {
      schema: {
        params: $WASettingsref("byAdAccountIdParamsSchema"),
        querystring: $WASettingsref("whatsappSettingsIdParamSchema"),
      },
    },
    syncAdsByAdAccountHandler,
  );

  server.post(
    "/subscribe/:whatsappSettingsId",
    {
      schema: {
        body: $WASettingsref("byFbPageQuerySchema"),
        params: $WASettingsref("whatsappSettingsIdParamSchema"),
      },
    },
    subscribeFieldstoPageHandler,
  );

  server.get("/meta-assets/:whatsappSettingsId", getMetaAssetsHandler);

  // server.get("/:settingsId/fbpages", getFbPagesFromMetaHandler);
}
