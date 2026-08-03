import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  getAllSubscriptionsHandler,
  getMessageStatsHandler,
  getSubscriptionHandler,
  getUserSubscriptionHandler,
  updateSubscriptionHandler,
} from "./subscription.controller.js";
import { assertRootOrg } from "../../utils/auth.js";
import { updateSubscriptionInput, updateSubscriptionInputSchema } from "./subscription.schema.js";
import { ByOrgIdParams, byOrgIdParams } from "../org/org.schema.js";

export async function subscriptionRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.get("/", getUserSubscriptionHandler);
  server.get(
    "/all",
    {
      preHandler: assertRootOrg,
    },
    getAllSubscriptionsHandler,
  );
  server.get<{ Params: ByOrgIdParams }>(
    "/:orgId",
    {
      preHandler: assertRootOrg,
    },
    getSubscriptionHandler,
  );
  server.put<{ Params: ByOrgIdParams; Body: updateSubscriptionInput }>(
    "/:orgId",
    {
      preHandler: assertRootOrg,
      schema: {
        params: byOrgIdParams,
        body: updateSubscriptionInputSchema,
      },
    },
    updateSubscriptionHandler,
  );

  server.put<{ Params: ByOrgIdParams; Body: updateSubscriptionInput }>(
    "/menu/:orgId",
    {
      schema: {
        params: byOrgIdParams,
        body: updateSubscriptionInputSchema,
      },
    },
    updateSubscriptionHandler,
  );

  server.get<{ Params: ByOrgIdParams; Querystring: { dateRange?: string } }>(
    "/message-stats/:orgId",
    getMessageStatsHandler,
  );
}
