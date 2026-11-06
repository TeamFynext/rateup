import { FastifyInstance } from "fastify";

import { assertRootOrg } from "../../utils/auth.js";
import { getAdminOverviewHandler } from "./admin.controller.js";
import { overviewQuerySchema, type OverviewQueryInput } from "./admin.schema.js";
import { declareAccess } from "../../authz/registry.js";

/** Business-wide figures. Root-org only — this is every customer's data in one response. */
export async function adminRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.get<{ Querystring: OverviewQueryInput }>(
    "/overview",
    { preHandler: [assertRootOrg], schema: { querystring: overviewQuerySchema } },
    getAdminOverviewHandler,
  );
}
