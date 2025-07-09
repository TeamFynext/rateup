import { FastifyInstance } from "fastify";
import {
  createWaSettingsHandler,
  deleteWaSettingsHandler,
  getContactTagHandler,
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

  server.post("/sync/pages", syncFbPagesHandler);

  server.post(
    "/sync/leadgen-forms",
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
      },
    },
    syncLeadgenFormQuestionsHandler,
  );

  server.post("/sync/ad-accounts", syncAdAccountsHandler);

  server.post(
    "/sync/ads/:adAccountId",
    {
      schema: {
        params: $WASettingsref("byAdAccountIdParamsSchema"),
      },
    },
    syncAdsByAdAccountHandler,
  );

  server.post(
    "/subscribe",
    {
      schema: {
        body: $WASettingsref("byFbPageQuerySchema"),
      },
    },
    subscribeFieldstoPageHandler,
  );

  server.get("/meta-assets", getMetaAssetsHandler);
}
