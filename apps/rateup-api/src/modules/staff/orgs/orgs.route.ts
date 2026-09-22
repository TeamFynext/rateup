import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listOrders } from "../billing/billing.service.js";
import { idParamSchema, pageQuerySchema, type IdParam } from "../staff.schema.js";
import { orgListQuerySchema, type OrgListQuery } from "./orgs.schema.js";
import {
  getOrgActivity,
  getOrgChannels,
  getOrgInvoicesForStaff,
  getOrgMembers,
  getOrgMessageStats,
  getOrgSummary,
  getOrgUsage,
  listOrgs,
  listPlanOptions,
} from "./orgs.service.js";

const messageStatsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const activityQuerySchema = pageQuerySchema.extend({
  source: z.enum(["customer", "staff"]).default("customer"),
});

export async function staffOrgRoutes(server: FastifyInstance) {
  server.get<{ Querystring: OrgListQuery }>(
    "/orgs",
    { schema: { querystring: orgListQuerySchema } },
    async (request) => listOrgs(request.query),
  );

  server.get("/orgs/plans", async () => ({ data: await listPlanOptions() }));

  const byId = { schema: { params: idParamSchema } };

  server.get<{ Params: IdParam }>("/orgs/:id", byId, async (request) => ({
    data: await getOrgSummary(request.params.id),
  }));
  server.get<{ Params: IdParam }>("/orgs/:id/members", byId, async (request) => ({
    data: await getOrgMembers(request.params.id),
  }));
  server.get<{ Params: IdParam }>("/orgs/:id/usage", byId, async (request) => ({
    data: await getOrgUsage(request.params.id),
  }));
  server.get<{ Params: IdParam }>("/orgs/:id/channels", byId, async (request) => ({
    data: await getOrgChannels(request.params.id),
  }));
  server.get<{ Params: IdParam; Querystring: z.infer<typeof pageQuerySchema> }>(
    "/orgs/:id/orders",
    { schema: { params: idParamSchema, querystring: pageQuerySchema } },
    async (request) => listOrders({ ...request.query, q: undefined, orgId: request.params.id }),
  );
  server.get<{ Params: IdParam }>("/orgs/:id/invoices", byId, async (request) => ({
    data: await getOrgInvoicesForStaff(request.params.id),
  }));
  server.get<{ Params: IdParam; Querystring: z.infer<typeof messageStatsQuerySchema> }>(
    "/orgs/:id/message-stats",
    { schema: { params: idParamSchema, querystring: messageStatsQuerySchema } },
    async (request) => ({ data: await getOrgMessageStats(request.params.id, request.query) }),
  );
  server.get<{ Params: IdParam; Querystring: z.infer<typeof activityQuerySchema> }>(
    "/orgs/:id/activity",
    { schema: { params: idParamSchema, querystring: activityQuerySchema } },
    async (request) => getOrgActivity(request.params.id, request.query),
  );
}
