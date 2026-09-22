import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { SESSION_IDLE_MS } from "../staff.session.js";
import { asUuid, pageArgs, pageQuerySchema, searchTextSchema } from "../staff.schema.js";

export const auditQuerySchema = pageQuerySchema.extend({
  /** Staff email, action, org name, or a pasted org / user / staff id. */
  q: searchTextSchema,
  action: z.string().max(100).optional(),
  staffUserId: z.uuid().optional(),
  orgId: z.uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export function auditWhere(
  query: Omit<AuditQuery, "page" | "pageSize">,
): Prisma.StaffAuditLogWhereInput {
  const and: Prisma.StaffAuditLogWhereInput[] = [];
  if (query.action) and.push({ action: query.action });
  if (query.staffUserId) and.push({ staffUserId: query.staffUserId });
  if (query.orgId) and.push({ targetOrgId: query.orgId });
  if (query.from) and.push({ createdAt: { gte: query.from } });
  if (query.to) and.push({ createdAt: { lte: query.to } });
  if (query.q) {
    const id = asUuid(query.q);
    const text = { contains: query.q, mode: "insensitive" as const };
    and.push({
      OR: id
        ? [{ targetOrgId: id }, { targetUserId: id }, { staffUserId: id }]
        : [{ staffEmail: text }, { action: text }, { targetOrgName: text }, { reason: text }],
    });
  }
  return and.length ? { AND: and } : {};
}

export async function listAudit(query: AuditQuery) {
  const where = auditWhere(query);
  const [rows, total] = await Promise.all([
    prisma.staffAuditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...pageArgs(query),
    }),
    prisma.staffAuditLog.count({ where }),
  ]);
  return { page: query.page, pageSize: query.pageSize, total, data: rows };
}

export async function staffAccessRoutes(server: FastifyInstance) {
  /** Who can sign in to the console, and who is signed in right now. */
  server.get("/staff-users", async () => {
    const now = new Date();
    const [staff, openSessions] = await Promise.all([
      prisma.staffUser.findMany({ orderBy: [{ active: "desc" }, { email: "asc" }] }),
      prisma.staffSession.groupBy({
        by: ["staffUserId"],
        where: {
          revokedAt: null,
          expiresAt: { gt: now },
          lastSeenAt: { gt: new Date(now.getTime() - SESSION_IDLE_MS) },
        },
        _count: { _all: true },
      }),
    ]);
    const open = new Map(openSessions.map((row) => [row.staffUserId, row._count._all]));
    const emails = new Map(staff.map((member) => [member.id, member.email]));
    return {
      data: staff.map((member) => ({
        id: member.id,
        email: member.email,
        name: member.name,
        avatarUrl: member.avatarUrl,
        active: member.active,
        isOwner: member.isOwner,
        linkedToGoogle: Boolean(member.googleSub),
        createdAt: member.createdAt,
        addedBy: member.createdById ? (emails.get(member.createdById) ?? null) : null,
        lastLoginAt: member.lastLoginAt,
        deactivatedAt: member.deactivatedAt,
        openSessions: open.get(member.id) ?? 0,
      })),
    };
  });

  server.get<{ Querystring: AuditQuery }>(
    "/audit",
    { schema: { querystring: auditQuerySchema } },
    async (request) => listAudit(request.query),
  );

  /** The action names that exist, for the log's filter menu. */
  server.get("/audit/actions", async () => {
    const rows = await prisma.staffAuditLog.groupBy({
      by: ["action"],
      _count: { _all: true },
      orderBy: { action: "asc" },
    });
    return { data: rows.map((row) => ({ action: row.action, count: row._count._all })) };
  });
}
