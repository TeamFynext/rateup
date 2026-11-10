import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { log } from "../../../../utils/logger.js";
import prisma from "../../../../utils/prisma.js";
import { findTask, MAINTENANCE_TASKS } from "../../maintenance/maintenance.tasks.js";
import { runTask } from "../../maintenance/task.js";
import {
  ACTIVE_RUN_STATES,
  newBackgroundRun,
  readBackgroundRun,
  updateBackgroundRun,
} from "../../maintenance/backgroundRun.js";
import {
  enqueueMaintenanceRun,
  maintenanceJobId,
  maintenanceQueue,
} from "../../../../workers/bullmq/queues/maintenance.queue.js";
import redis from "../../../../utils/redisConnection.js";
import { handleMaintenanceSocket } from "./maintenance.ws.js";
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
    data: MAINTENANCE_TASKS.map(({ id, title, description, destructive, background }) => ({
      id,
      title,
      description,
      destructive,
      background: Boolean(background),
    })),
  }));

  /** Pushes every background run update as it happens; see maintenance.ws.ts. */
  server.get("/ops/maintenance/ws", { websocket: true }, handleMaintenanceSocket);

  /** Where the background run of a task stands (null when it has never been started). */
  server.get<{ Params: TaskParam }>(
    "/ops/maintenance/tasks/:taskId/run",
    { schema: { params: taskParamSchema } },
    async (request) => {
      const task = findTask(request.params.taskId);
      if (!task) throw new StaffHttpError(404, "TASK_NOT_FOUND", "No such maintenance task.");
      return { data: await readBackgroundRun(task.id) };
    },
  );

  /** Asks a background run to stop after its current round; Apply again resumes it. */
  server.post<{ Params: TaskParam }>(
    "/ops/maintenance/tasks/:taskId/stop",
    { schema: { params: taskParamSchema } },
    async (request) => {
      const task = findTask(request.params.taskId);
      if (!task) throw new StaffHttpError(404, "TASK_NOT_FOUND", "No such maintenance task.");
      const current = await readBackgroundRun(task.id);
      if (!current || !ACTIVE_RUN_STATES.includes(current.state)) {
        throw new StaffHttpError(409, "NOT_RUNNING", "That task is not running.");
      }
      // A job still waiting for a worker can simply be dropped.
      const job = await maintenanceQueue.getJob(maintenanceJobId(task.id));
      const removed = job && (await job.isWaiting()) ? await job.remove().then(() => true) : false;
      const run = await updateBackgroundRun(task.id, (r) => {
        r.stopRequested = true;
        if (removed) {
          r.state = "stopped";
          r.summary = `Stopped after ${r.rounds} round(s). Apply again to carry on from there.`;
        }
      });
      await recordStaffAction(prisma, request, {
        action: "maintenance.stop",
        after: { taskId: task.id, rounds: run?.rounds },
      });
      return { data: run };
    },
  );

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
   * The real run. Two things stand in front of it: the task id typed back and a reason. The audit row is written before the task starts, so
   * a run that crashes half-way is still on record as attempted.
   */
  server.post<{ Params: TaskParam; Body: ApplyBody }>(
    "/ops/maintenance/tasks/:taskId/apply",
    { schema: { params: taskParamSchema, body: applyBodySchema } },
    async (request) => {
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

      if (task.background) {
        // Held for the few milliseconds between "is one running?" and "queue it", so two
        // clicks cannot both start a run. The single job id per task backs this up.
        const lockKey = `maintenance:starting:${task.id}`;
        if ((await redis.set(lockKey, "1", "EX", 15, "NX")) !== "OK") {
          throw new StaffHttpError(409, "ALREADY_RUNNING", "That task is already starting.");
        }
        try {
          const jobId = maintenanceJobId(task.id);
          if (await maintenanceQueue.getJob(jobId)) {
            throw new StaffHttpError(
              409,
              "ALREADY_RUNNING",
              "That task is already running in the background.",
            );
          }
          await recordStaffAction(prisma, request, {
            id: auditId,
            action: "maintenance.apply",
            reason: request.body.reason,
            after: { taskId: task.id, status: "queued" },
          });
          const run = await newBackgroundRun(task.id, jobId, auditId, request.staff?.email ?? null);
          await enqueueMaintenanceRun({ taskId: task.id, auditId });
          return { data: { background: true as const, run } };
        } finally {
          await redis.del(lockKey);
        }
      }

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

  // Test data: refused outside NODE_ENV=development by the service, whatever the console shows.
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
