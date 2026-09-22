import type { FastifyInstance } from "fastify";
import prisma from "../../../utils/prisma.js";
import { getAdminOverview } from "../../admin/admin.service.js";
import { overviewQuerySchema, type OverviewQueryInput } from "../../admin/admin.schema.js";

const DAY_MS = 24 * 60 * 60_000;
/** The overview's "expiring soon" panel looks this far ahead. */
const EXPIRING_WINDOW_DAYS = 14;
const EXPIRING_LIMIT = 6;

/** Active subscriptions that run out soonest (who to call this week), and how many there are. */
async function expiringSoon(now = new Date()) {
  const where = {
    expiresAt: { gt: now, lte: new Date(now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS) },
  };
  const [total, rows] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: { expiresAt: "asc" },
      take: EXPIRING_LIMIT,
      select: {
        expiresAt: true,
        org: { select: { id: true, name: true, logo: true } },
        basePlan: { select: { name: true, displayName: true } },
      },
    }),
  ]);
  return {
    windowDays: EXPIRING_WINDOW_DAYS,
    total,
    orgs: rows.map((row) => ({
      orgId: row.org.id,
      name: row.org.name,
      logo: row.org.logo,
      plan: row.basePlan ? (row.basePlan.displayName ?? row.basePlan.name) : null,
      expiresAt: row.expiresAt,
    })),
  };
}

export async function staffOverviewRoutes(server: FastifyInstance) {
  server.get<{ Querystring: OverviewQueryInput }>(
    "/overview",
    { schema: { querystring: overviewQuerySchema } },
    async (request) => {
      const [overview, expiring] = await Promise.all([
        getAdminOverview(request.query.months),
        expiringSoon(),
      ]);
      return { data: { ...overview, expiringSoon: expiring } };
    },
  );
}
