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
import { updateSubscriptionInputSchema } from "./subscription.schema.js";
import { byOrgIdParams } from "../org/org.schema.js";

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
        params: byOrgIdParams,
        body: updateSubscriptionInputSchema,
      },
    },
    updateSubscriptionHandler,
  );

  server.put(
    "/menu/:orgId",
    {
      schema: {
        params: byOrgIdParams,
        body: updateSubscriptionInputSchema,
      },
    },
    updateSubscriptionHandler,
  );

  server.get("/message-stats/:orgId", getMessageStatsHandler);
}
