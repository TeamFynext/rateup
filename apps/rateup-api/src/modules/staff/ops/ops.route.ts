import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { findTask, MAINTENANCE_TASKS } from "../../maintenance/maintenance.tasks.js";
import { runTask } from "../../maintenance/task.js";
import { StaffHttpError } from "../staff.errors.js";
import { recordStaffAction } from "../staffAudit.js";

const taskParamSchema = z.object({ taskId: z.string().min(1).max(100) });

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
  server.post<{ Params: z.infer<typeof taskParamSchema> }>(
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
}
