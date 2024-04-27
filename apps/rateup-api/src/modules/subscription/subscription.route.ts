import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  getAllSubscriptionsHandler,
  getSubscriptionHandler,
  getUserSubscriptionHandler,
  subUpgradeHandler,
  updateSubscriptionHandler,
} from "./subscription.controller";
import { assertRootOrg } from "../../utils/auth";
import { $subscriptionRef } from "./subscription.schema";
import { $Sref } from "../org/org.schema";

export async function subscriptionRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  //SUBB TEMP
  server.get("/upgrade", subUpgradeHandler);

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
}
