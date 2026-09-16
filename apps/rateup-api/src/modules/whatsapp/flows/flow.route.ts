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
  getFlowTemplatesHandler,
  getUnsyncedFlowsHandler,
  importFlowsHandler,
  publishFlowHandler,
  saveFlowJsonToWhatsappHandler,
  sendFlowHandler,
  updateFlowHandler,
  updateFlowMetaDataHandler,
} from "./flow.controller.js";
import { log } from "../../../utils/logger.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { requireFeature, TeamFeature } from "../../../utils/permissions.js";
import {
  type ByDbFlowIdParams,
  byDbFlowIdParams,
  byWaFlowIdParams,
  byWhatsappSettingsPhoneQuery,
  cloneFlowSchema,
  type CreateFlowInput,
  createFlowInput,
  flowTemplatesResponse,
  importFlowsBody,
  templatesQuery,
  type SendFlowBody,
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
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Whatsapp]),
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
  // Ready-made flows for a category — what the create-flow wizard offers.
  server.get(
    "/templates",
    {
      schema: {
        querystring: templatesQuery,
        response: { 200: flowTemplatesResponse },
      },
    },
    getFlowTemplatesHandler,
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

  server.get(
    "/unsynced",
    {
      schema: {
        querystring: byWhatsappSettingsPhoneQuery,
      },
    },
    getUnsyncedFlowsHandler,
  );

  server.post(
    "/import",
    {
      schema: {
        body: importFlowsBody,
      },
    },
    importFlowsHandler,
  );

  server.post<{ Body: CreateFlowInput }>(
    "/",
    {
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

  server.post<{ Body: SendFlowBody; Params: ByDbFlowIdParams }>(
    "/:dbFlowId/send",
    {
      schema: {
        body: sendFlowBodySchema,
        params: byDbFlowIdParams,
      },
    },
    sendFlowHandler,
  );
}
