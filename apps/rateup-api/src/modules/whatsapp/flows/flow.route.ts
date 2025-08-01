import { FastifyInstance } from "fastify";
import { getFlowsFromWa } from "./flow.service";
import { checkSession } from "../../../utils/checkSession";
import { $waFlow } from "./flow.schema";
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
} from "./flow.controller";
import { log } from "../../../utils/logger";
import { verifyMessageMonthlyLimitRestriction } from "../messageTemplates/wa_templates.auth";
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { verifyFlowSubscriptionLimit } from "./flow.utils";

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

  server.get(
    "/",
    {
      schema: {
        querystring: $waFlow("sourceQuery"),
      },
    },
    getFlowsHandler,
  );
  server.get(
    "/:waFlowId",
    {
      schema: {
        params: $waFlow("byWaFlowIdParams"),
      },
    },
    getFlowHandler,
  );
  server.get(
    "/:waFlowId/json",
    {
      schema: {
        params: $waFlow("byWaFlowIdParams"),
      },
    },
    getFlowJsonHandler,
  );
  server.get(
    "/metrics/:waFlowId",
    {
      schema: {
        params: $waFlow("byWaFlowIdParams"),
      },
    },
    getFlowMetricsHandler,
  );

  server.get("/unsynced", getUnsyncedFlowsHandler);

  server.post(
    "/import",
    {
      schema: {
        body: $waFlow("importFlowsBody"),
      },
    },
    importFlowsHandler,
  );

  server.post(
    "/",
    {
      preHandler: verifyFlowSubscriptionLimit,
      schema: {
        body: $waFlow("createFlowInput"),
      },
    },
    createFlowHandler,
  );
  server.put(
    "/:dbFlowId",
    {
      schema: {
        params: $waFlow("byDbFlowIdParams"),
        body: $waFlow("updateFlowInput"),
      },
    },
    updateFlowHandler,
  );
  server.put(
    "/:dbFlowId/push-to-wa",
    {
      schema: {
        params: $waFlow("byDbFlowIdParams"),
      },
    },
    saveFlowJsonToWhatsappHandler,
  );
  server.put(
    "/update-flow-metadata/:dbFlowId",
    {
      schema: {
        params: $waFlow("byDbFlowIdParams"),
        body: $waFlow("updateFlowMetaInput"),
      },
    },
    updateFlowMetaDataHandler,
  );
  //this clone and deprecate the old one
  server.put(
    "/clone-and-deprecate/:dbFlowId",
    {
      schema: {
        params: $waFlow("byDbFlowIdParams"),
      },
    },
    cloneAndDeprecateFlowHandler,
  );

  //this clone and create new flow
  server.put(
    "/clone/:dbFlowId",
    {
      schema: {
        params: $waFlow("byDbFlowIdParams"),
        body: $waFlow("cloneFlowSchema"),
      },
    },
    cloneFlowHandler,
  );
  server.get(
    "/:dbFlowId/preview",
    {
      schema: {
        params: $waFlow("byDbFlowIdParams"),
      },
    },
    getFlowPreviewHandler,
  );

  server.delete(
    "/:dbFlowId",
    {
      schema: {
        params: $waFlow("byDbFlowIdParams"),
      },
    },
    deleteFlowHandler,
  );

  server.post(
    "/:dbFlowId/deprecate",
    {
      schema: {
        params: $waFlow("byDbFlowIdParams"),
      },
    },
    deprecateFlowHandler,
  );

  server.post(
    "/:dbFlowId/publish",
    {
      schema: {
        params: $waFlow("byDbFlowIdParams"),
      },
    },
    publishFlowHandler,
  );

  server.post(
    "/:dbFlowId/send",
    {
      preHandler: verifyMessageMonthlyLimitRestriction,
      schema: {
        body: $waFlow("sendFlowBodySchema"),
        params: $waFlow("byDbFlowIdParams"),
      },
    },
    sendFlowHandler,
  );
}
