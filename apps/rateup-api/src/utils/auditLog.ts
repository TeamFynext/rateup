import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "./prisma.js";

const actionMap: Record<string, string> = {
  POST: "Create",
  PUT: "Update",
  PATCH: "Update",
  DELETE: "Delete",
};

// Routes whose writes are pure inbox chatter: sending a message (or a private
// note) already shows up in the conversation itself, and marking a chat read
// fires on every open. Logging them buries the real team activity, so skip them.
const SKIPPED_ROUTES = new Set([
  "/api/wa/inbox/message/:contactId",
  "/api/wa/inbox/message/privatemessage/:contactId",
  "/api/wa/inbox/message/mark/:contactId",
  // Channel connect/disconnect records its own event via `recordAuditEvent` — the
  // handler knows whether a channel was actually added, updated or removed, which
  // the route alone can't tell (PUT /settings is an upsert). Skipping here keeps
  // one row per action instead of two, and keeps access tokens out of the log.
  "/api/wa/settings/",
  "/api/wa/settings/:phoneId",
  "/api/wa/auth/register",
  "/api/wa/auth/deregister/:phoneId",
]);

/**
 * Record a team-activity entry the generic hook can't describe on its own, e.g.
 * "Channel added". `action` is shown verbatim in the Team Activity table, so keep
 * it short and human-readable, and pass only non-sensitive details in `body`.
 */
export async function recordAuditEvent(
  request: FastifyRequest,
  action: string,
  body?: Record<string, unknown>,
) {
  try {
    const userId = request.userId;
    if (!userId) return;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        method: request.method,
        route: request.url ?? request.routeOptions?.url,
        body: body ?? {},
        orgId: request.user?.orgId ?? null,
      },
    });
  } catch (err) {
    request.log?.error({ err }, "Failed to record audit event");
  }
}

export async function auditLogHook(request: FastifyRequest, _reply: FastifyReply) {
  // Skip GET requests
  if (request.method === "GET") return;

  const routePattern = request.routeOptions?.url;
  if (routePattern && SKIPPED_ROUTES.has(routePattern)) return;

  try {
    // Assuming user info is available on request.user (e.g. from JWT)
    const userId = request.userId;
    if (!userId) return; // skip if unauthenticated

    const readableAction = actionMap[request.method] ?? "Other";
    const route = request.url ?? routePattern;
    await prisma.auditLog.create({
      data: {
        userId,
        action: readableAction,
        method: request.method,
        route: route,
        body: request.body ?? {},
        orgId: request.user?.orgId ?? null,
      },
    });
  } catch (err) {
    request.log.error({ err }, "Failed to record audit log");
  }
}
