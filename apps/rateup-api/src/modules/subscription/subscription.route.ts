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
import { $subscriptionRef } from "./subscription.schema.js";
import { $Sref } from "../org/org.schema.js";

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
  server.get(
    "/:orgId",
    {
      preHandler: assertRootOrg,
    },
    getSubscriptionHandler,
  );
  server.put(
    "/:orgId",
    {
      preHandler: assertRootOrg,
      schema: {
        params: $Sref("byOrgIdParams"),
        body: $subscriptionRef("updateSubscriptionInputSchema"),
      },
    },
    updateSubscriptionHandler,
  );

  server.put(
    "/menu/:orgId",
    {
      schema: {
        params: $Sref("byOrgIdParams"),
        body: $subscriptionRef("updateSubscriptionInputSchema"),
      },
    },
    updateSubscriptionHandler,
  );

  server.get("/message-stats/:orgId", getMessageStatsHandler);
}
