import { FastifyInstance } from "fastify";

import { assertRootOrg } from "../../utils/auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { getAdminOverviewHandler } from "./admin.controller.js";
import { overviewQuerySchema, type OverviewQueryInput } from "./admin.schema.js";

/** Business-wide figures. Root-org only — this is every customer's data in one response. */
export async function adminRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.get<{ Querystring: OverviewQueryInput }>(
    "/overview",
    { preHandler: [assertRootOrg], schema: { querystring: overviewQuerySchema } },
    getAdminOverviewHandler,
  );
}
