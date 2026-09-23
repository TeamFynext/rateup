import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listOrders } from "../billing/billing.service.js";
import { idParamSchema, pageQuerySchema, type IdParam } from "../staff.schema.js";
import {
  deleteOrgAsStaff,
  deleteOrgSchema,
  deletionWarningSchema,
  previewOrgDeletion,
  warnOrgDeletion,
  type DeleteOrgInput,
  type DeletionWarningInput,
} from "./deletion.service.js";
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
import {
  addonGrantSchema,
  addonParamSchema,
  expiryChangeSchema,
  featureOverrideSchema,
  planChangeSchema,
  reasonOnlySchema,
  type AddonGrantInput,
  type AddonParam,
  type ExpiryChangeInput,
  type FeatureOverrideInput,
  type PlanChangeInput,
  type ReasonOnlyInput,
} from "./subscription.schema.js";
import {
  changeOrgExpiry,
  changeOrgPlan,
  getOrgSubscription,
  grantAddonPacks,
  overrideOrgFeatures,
  revokeAddonPack,
} from "./subscription.service.js";
import {
  noteParamSchema,
  noteSchema,
  noteUpdateSchema,
  reasonOnlyBodySchema,
  type NoteInput,
  type NoteParam,
  type NoteUpdateInput,
  type ReasonOnlyInput as SuspendInput,
} from "./suspension.schema.js";
import {
  addOrgNote,
  deleteOrgNote,
  editOrgNote,
  listOrgNotes,
  suspendOrg,
  unsuspendOrg,
} from "./suspension.service.js";

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

  server.get<{ Params: IdParam }>("/orgs/:id/subscription", byId, async (request) => ({
    data: await getOrgSubscription(request.params.id),
  }));

  // Subscription changes. Every body carries a reason, stored on the audit row.
  server.put<{ Params: IdParam; Body: PlanChangeInput }>(
    "/orgs/:id/subscription/plan",
    { schema: { params: idParamSchema, body: planChangeSchema } },
    async (request) => ({ data: await changeOrgPlan(request, request.params.id, request.body) }),
  );
  server.put<{ Params: IdParam; Body: ExpiryChangeInput }>(
    "/orgs/:id/subscription/expiry",
    { schema: { params: idParamSchema, body: expiryChangeSchema } },
    async (request) => ({
      data: await changeOrgExpiry(request, request.params.id, request.body),
    }),
  );
  server.put<{ Params: IdParam; Body: FeatureOverrideInput }>(
    "/orgs/:id/subscription/overrides",
    { schema: { params: idParamSchema, body: featureOverrideSchema } },
    async (request) => ({
      data: await overrideOrgFeatures(request, request.params.id, request.body),
    }),
  );
  server.post<{ Params: IdParam; Body: AddonGrantInput }>(
    "/orgs/:id/addons",
    { schema: { params: idParamSchema, body: addonGrantSchema } },
    async (request) => ({
      data: await grantAddonPacks(request, request.params.id, request.body),
    }),
  );
  server.post<{ Params: AddonParam; Body: ReasonOnlyInput }>(
    "/orgs/:id/addons/:addonId/revoke",
    { schema: { params: addonParamSchema, body: reasonOnlySchema } },
    async (request) => ({
      data: await revokeAddonPack(request, request.params.id, request.params.addonId, request.body),
    }),
  );

  // Suspension: the customer's sessions, API key and outbound sends all stop.
  server.post<{ Params: IdParam; Body: SuspendInput }>(
    "/orgs/:id/suspend",
    { schema: { params: idParamSchema, body: reasonOnlyBodySchema } },
    async (request) => ({ data: await suspendOrg(request, request.params.id, request.body) }),
  );
  server.post<{ Params: IdParam; Body: SuspendInput }>(
    "/orgs/:id/unsuspend",
    { schema: { params: idParamSchema, body: reasonOnlyBodySchema } },
    async (request) => ({ data: await unsuspendOrg(request, request.params.id, request.body) }),
  );

  // Staff notes on the account. Never shown to the customer.
  server.get<{ Params: IdParam }>("/orgs/:id/notes", byId, async (request) => ({
    data: await listOrgNotes(request.params.id),
  }));
  server.post<{ Params: IdParam; Body: NoteInput }>(
    "/orgs/:id/notes",
    { schema: { params: idParamSchema, body: noteSchema } },
    async (request) => ({ data: await addOrgNote(request, request.params.id, request.body) }),
  );
  server.patch<{ Params: NoteParam; Body: NoteUpdateInput }>(
    "/orgs/:id/notes/:noteId",
    { schema: { params: noteParamSchema, body: noteUpdateSchema } },
    async (request) => ({
      data: await editOrgNote(request, request.params.id, request.params.noteId, request.body),
    }),
  );
  server.delete<{ Params: NoteParam }>(
    "/orgs/:id/notes/:noteId",
    { schema: { params: noteParamSchema } },
    async (request) => ({
      data: await deleteOrgNote(request, request.params.id, request.params.noteId),
    }),
  );

  // Deletion. The preview is a read; the delete needs a fresh Google sign-in and the name.
  server.get<{ Params: IdParam }>("/orgs/:id/deletion", byId, async (request) => ({
    data: await previewOrgDeletion(request.params.id),
  }));
  server.post<{ Params: IdParam; Body: DeletionWarningInput }>(
    "/orgs/:id/deletion-warning",
    { schema: { params: idParamSchema, body: deletionWarningSchema } },
    async (request) => ({
      data: await warnOrgDeletion(request, request.params.id, request.body),
    }),
  );
  server.delete<{ Params: IdParam; Body: DeleteOrgInput }>(
    "/orgs/:id",
    { schema: { params: idParamSchema, body: deleteOrgSchema } },
    async (request) => ({
      data: await deleteOrgAsStaff(request, request.params.id, request.body),
    }),
  );
}
