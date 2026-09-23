import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { findTask, MAINTENANCE_TASKS } from "../../maintenance/maintenance.tasks.js";
import { runTask } from "../../maintenance/task.js";
import { reasonSchema } from "../orgs/subscription.schema.js";
import { idParamSchema, type IdParam } from "../staff.schema.js";
import { StaffHttpError } from "../staff.errors.js";
import {
  addFakeInboxChats,
  addFakeResponses,
  addReferral,
  fakeInboxSchema,
  fakeResponsesSchema,
  listSurveyTargets,
  reasonBodySchema,
  referralCreateSchema,
  removeReferral,
  removeShopifyIntegration,
  testDataOrgQuerySchema,
  type FakeInboxInput,
  type FakeResponsesInput,
  type ReasonBody,
  type ReferralCreateInput,
  type TestDataOrgQuery,
} from "./ops.actions.js";
import { assertRecentAuth } from "../staff.session.js";
import { recordStaffAction } from "../staffAudit.js";

const taskParamSchema = z.object({ taskId: z.string().min(1).max(100) });
type TaskParam = z.infer<typeof taskParamSchema>;

/** Applying needs the task's id typed back, so the wrong card cannot be applied by reflex. */
const applyBodySchema = z.object({ confirm: z.string().trim().max(100), reason: reasonSchema });
type ApplyBody = z.infer<typeof applyBodySchema>;

/**
 * A Shopify integration as the console may see it. The `credential` column holds the
 * store's access token, so the shop domain is read out of it in SQL and the column itself
 * never leaves the database.
 */
interface ShopifyStoreRow {
  id: string;
  shop: string | null;
  active: boolean;
  createdAt: Date | null;
  orgId: string | null;
  orgName: string | null;
}

export async function staffOpsRoutes(server: FastifyInstance) {
  server.get("/ops/maintenance/tasks", async () => ({
    data: MAINTENANCE_TASKS.map(({ id, title, description, destructive }) => ({
      id,
      title,
      description,
      destructive,
    })),
  }));

  /**
   * A dry run: the task reports what it would change and writes nothing (every task honours
   * `apply: false`). Applying is a separate, step-up-guarded action.
   */
  server.post<{ Params: TaskParam }>(
    "/ops/maintenance/tasks/:taskId/preview",
    { schema: { params: taskParamSchema } },
    async (request) => {
      const task = findTask(request.params.taskId);
      if (!task) throw new StaffHttpError(404, "TASK_NOT_FOUND", "No such maintenance task.");
      try {
        const result = await runTask(task.run, false);
        await recordStaffAction(prisma, request, {
          action: "maintenance.preview",
          after: { taskId: task.id, summary: result.summary },
        });
        return { data: result };
      } catch (err) {
        log.warn({ err, taskId: task.id }, "staff: maintenance preview failed");
        throw new StaffHttpError(
          422,
          "TASK_FAILED",
          err instanceof Error ? err.message : "The task failed.",
        );
      }
    },
  );

  /**
   * The real run. Three things stand in front of it: a Google sign-in from the last 15
   * minutes (401 REAUTH_REQUIRED otherwise; the console re-runs sign-in and comes back), the
   * task id typed back, and a reason. The audit row is written before the task starts, so
   * a run that crashes half-way is still on record as attempted.
   */
  server.post<{ Params: TaskParam; Body: ApplyBody }>(
    "/ops/maintenance/tasks/:taskId/apply",
    { schema: { params: taskParamSchema, body: applyBodySchema } },
    async (request) => {
      assertRecentAuth(request.staffSession);
      const task = findTask(request.params.taskId);
      if (!task) throw new StaffHttpError(404, "TASK_NOT_FOUND", "No such maintenance task.");
      if (request.body.confirm !== task.id) {
        throw new StaffHttpError(
          422,
          "CONFIRM_MISMATCH",
          `Type the task id, ${task.id}, to apply it.`,
        );
      }
      const auditId = crypto.randomUUID();
      await recordStaffAction(prisma, request, {
        id: auditId,
        action: "maintenance.apply",
        reason: request.body.reason,
        after: { taskId: task.id, status: "started" },
      });
      try {
        const result = await runTask(task.run, true);
        await prisma.staffAuditLog.update({
          where: { id: auditId },
          data: { after: { taskId: task.id, status: "finished", summary: result.summary } },
        });
        return { data: result };
      } catch (err) {
        log.error({ err, taskId: task.id }, "staff: maintenance apply failed");
        const message = err instanceof Error ? err.message : "The task failed.";
        await prisma.staffAuditLog.update({
          where: { id: auditId },
          data: { after: { taskId: task.id, status: "failed", error: message } },
        });
        throw new StaffHttpError(422, "TASK_FAILED", message);
      }
    },
  );

  server.get("/ops/shopify", async () => {
    const rows = await prisma.$queryRaw<ShopifyStoreRow[]>`
      SELECT i.id,
             i.credential->'session'->>'shop' AS shop,
             i.active,
             i."createdAt",
             i."orgId",
             o.name AS "orgName"
      FROM "Integration" i
      LEFT JOIN "Org" o ON o.id = i."orgId"
      WHERE i.name = 'shopify'
      ORDER BY i."createdAt" DESC NULLS LAST`;
    return { data: rows };
  });

  server.get("/ops/referrals", async () => {
    const referrals = await prisma.referral.findMany({ orderBy: { created_at: "desc" } });
    const site = process.env.FRONTEND_URL?.replace(/\/$/, "");
    return {
      data: referrals.map((referral) => ({
        id: referral.id,
        code: referral.referral_code,
        link: site ? `${site}?ref=${encodeURIComponent(referral.referral_code)}` : null,
        name: referral.name,
        email: referral.email,
        visits: referral.visit_count,
        signups: referral.signup_count,
        createdAt: referral.created_at,
      })),
    };
  });

  const idAndReason = { schema: { params: idParamSchema, body: reasonBodySchema } };

  server.post<{ Body: ReferralCreateInput }>(
    "/ops/referrals",
    { schema: { body: referralCreateSchema } },
    async (request) => ({ data: await addReferral(request, request.body) }),
  );
  server.delete<{ Params: IdParam; Body: ReasonBody }>(
    "/ops/referrals/:id",
    idAndReason,
    async (request) => ({ data: await removeReferral(request, request.params.id, request.body) }),
  );
  server.delete<{ Params: IdParam; Body: ReasonBody }>(
    "/ops/shopify/:id",
    idAndReason,
    async (request) => ({
      data: await removeShopifyIntegration(request, request.params.id, request.body),
    }),
  );

  // Test data: refused in production by the service, whatever the console shows.
  server.get<{ Querystring: TestDataOrgQuery }>(
    "/ops/test-data/surveys",
    { schema: { querystring: testDataOrgQuerySchema } },
    async (request) => ({ data: await listSurveyTargets(request.query.orgId) }),
  );
  server.post<{ Body: FakeResponsesInput }>(
    "/ops/test-data/responses",
    { schema: { body: fakeResponsesSchema } },
    async (request) => ({ data: await addFakeResponses(request, request.body) }),
  );
  server.post<{ Body: FakeInboxInput }>(
    "/ops/test-data/inbox",
    { schema: { body: fakeInboxSchema } },
    async (request) => ({ data: await addFakeInboxChats(request, request.body) }),
  );
}
