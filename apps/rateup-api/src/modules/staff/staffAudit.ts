import type { FastifyRequest } from "fastify";
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { staffClientIp } from "./staff.guards.js";

type Db = PrismaClient | Prisma.TransactionClient;

const SECRET_KEY = /password|token|secret|key|authorization|cookie/i;
const MAX_DEPTH = 6;

/** A copy of `value` with every secret-looking key's value replaced, safe to store. */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
      key,
      SECRET_KEY.test(key) ? "[redacted]" : redact(inner, depth + 1),
    ]),
  );
}

export interface StaffActionInput {
  /** Dotted verb, e.g. `org.suspend`, `subscription.plan_change`. */
  action: string;
  targetOrgId?: string;
  targetOrgName?: string;
  targetUserId?: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
}

function json(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (redact(value) as Prisma.InputJsonValue);
}

function requestMeta(request: FastifyRequest) {
  return {
    method: request.method,
    route: request.routeOptions.url ?? request.url,
    ip: staffClientIp(request),
    userAgent: request.headers["user-agent"]?.slice(0, 512),
  };
}

/**
 * Records what a signed-in staff member did. Pass the mutation's transaction client so the
 * row commits (or rolls back) with the change it describes. Marks the request as audited,
 * so the plugin's fallback row is not written as well.
 */
export async function recordStaffAction(
  db: Db,
  request: FastifyRequest,
  input: StaffActionInput,
): Promise<void> {
  const staff = request.staff;
  if (!staff) throw new Error("recordStaffAction called on a request without a staff session");
  await db.staffAuditLog.create({
    data: {
      staffUserId: staff.id,
      staffEmail: staff.email,
      ...requestMeta(request),
      action: input.action,
      targetOrgId: input.targetOrgId,
      targetOrgName: input.targetOrgName,
      targetUserId: input.targetUserId,
      reason: input.reason,
      before: json(input.before),
      after: json(input.after),
      body: json(request.body),
    },
  });
  request.staffAuditRecorded = true;
}

/**
 * Sign-in events, which happen before there is a `request.staff`: a refused login may come
 * from someone who is not on the allowlist at all.
 */
export async function recordStaffAuthEvent(
  request: FastifyRequest,
  event: { action: string; staffEmail: string; staffUserId?: string; reason?: string },
): Promise<void> {
  await prisma.staffAuditLog.create({
    data: {
      staffUserId: event.staffUserId,
      staffEmail: event.staffEmail,
      action: event.action,
      reason: event.reason,
      ...requestMeta(request),
    },
  });
  request.staffAuditRecorded = true;
}
