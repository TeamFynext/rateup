import { FastifyInstance } from "fastify";
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
import { declareAccess } from "../../authz/registry.js";

export async function subscriptionRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  // Every route but GET / answers for orgs other than the caller's (all of them, or the one in
  // the URL), so each of them is the root org's alone.
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
  server.get<{ Params: ByOrgIdParams; Querystring: { dateRange?: string } }>(
    "/message-stats/:orgId",
    {
      preHandler: assertRootOrg,
    },
    getMessageStatsHandler,
  );
}
