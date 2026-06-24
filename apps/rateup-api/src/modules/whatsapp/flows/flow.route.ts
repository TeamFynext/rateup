import { FastifyInstance } from "fastify";
import { checkSession } from "../../../utils/checkSession.js";
import {
  cloneAndDeprecateFlowHandler,
  cloneFlowHandler,
  createFlowHandler,
  deleteFlowHandler,
  deprecateFlowHandler,
  getFlowHandler,
  getFlowJsonHandler,
  getFlowMetricsHandler,
  getFlowPreviewHandler,
  getFlowsHandler,
  getUnsyncedFlowsHandler,
  importFlowsHandler,
  publishFlowHandler,
  saveFlowJsonToWhatsappHandler,
  sendFlowHandler,
  updateFlowHandler,
  updateFlowMetaDataHandler,
} from "./flow.controller.js";
import { log } from "../../../utils/logger.js";
import { verifyMessageMonthlyLimitRestriction } from "../messageTemplates/wa_templates.auth.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { requireFeature, TeamFeature } from "../../../utils/permissions.js";
import { verifyFlowSubscriptionLimit } from "./flow.utils.js";
import {
  byDbFlowIdParams,
  byWaFlowIdParams,
  cloneFlowSchema,
  createFlowInput,
  importFlowsBody,
  sendFlowBodySchema,
  sourceQuery,
  updateFlowInput,
  updateFlowMetaInput,
} from "./flow.schema.js";

export async function flowRoutes(server: FastifyInstance) {
  server.addHook("onError", (req, res, err, done) => {
    log.error(err);
    done();
  });
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.WhatsAppFlow]),
  );
  server.addHook("preHandler", requireFeature(TeamFeature.flows));

  server.get(
    "/",
    {
      schema: {
        querystring: sourceQuery,
      },
    },
    getFlowsHandler,
  );
  server.get(
    "/:waFlowId",
    {
      schema: {
        params: byWaFlowIdParams,
      },
    },
    getFlowHandler,
  );
  server.get(
    "/:waFlowId/json",
    {
      schema: {
        params: byWaFlowIdParams,
      },
    },
    getFlowJsonHandler,
  );
  server.get(
    "/metrics/:waFlowId",
    {
      schema: {
        params: byWaFlowIdParams,
      },
    },
    getFlowMetricsHandler,
  );

  server.get("/unsynced", getUnsyncedFlowsHandler);

  server.post(
    "/import",
    {
      schema: {
        body: importFlowsBody,
      },
    },
    importFlowsHandler,
  );

  server.post(
    "/",
    {
      preHandler: verifyFlowSubscriptionLimit,
      schema: {
        body: createFlowInput,
      },
    },
    createFlowHandler,
  );
  server.put(
    "/:dbFlowId",
    {
      schema: {
        params: byDbFlowIdParams,
        body: updateFlowInput,
      },
    },
    updateFlowHandler,
  );
  server.put(
    "/:dbFlowId/push-to-wa",
    {
      schema: {
        params: byDbFlowIdParams,
      },
    },
    saveFlowJsonToWhatsappHandler,
  );
  server.put(
    "/update-flow-metadata/:dbFlowId",
    {
      schema: {
        params: byDbFlowIdParams,
        body: updateFlowMetaInput,
      },
    },
    updateFlowMetaDataHandler,
  );
  //this clone and deprecate the old one
  server.put(
    "/clone-and-deprecate/:dbFlowId",
    {
      schema: {
        params: byDbFlowIdParams,
      },
    },
    cloneAndDeprecateFlowHandler,
  );

  //this clone and create new flow
  server.put(
    "/clone/:dbFlowId",
    {
      schema: {
        params: byDbFlowIdParams,
        body: cloneFlowSchema,
      },
    },
    cloneFlowHandler,
  );
  server.get(
    "/:dbFlowId/preview",
    {
      schema: {
        params: byDbFlowIdParams,
      },
    },
    getFlowPreviewHandler,
  );

  server.delete(
    "/:dbFlowId",
    {
      schema: {
        params: byDbFlowIdParams,
      },
    },
    deleteFlowHandler,
  );

  server.post(
    "/:dbFlowId/deprecate",
    {
      schema: {
        params: byDbFlowIdParams,
      },
    },
    deprecateFlowHandler,
  );

  server.post(
    "/:dbFlowId/publish",
    {
      schema: {
        params: byDbFlowIdParams,
      },
    },
    publishFlowHandler,
  );

  server.post(
    "/:dbFlowId/send",
    {
      preHandler: verifyMessageMonthlyLimitRestriction,
      schema: {
        body: sendFlowBodySchema,
        params: byDbFlowIdParams,
      },
    },
    sendFlowHandler,
  );
}
