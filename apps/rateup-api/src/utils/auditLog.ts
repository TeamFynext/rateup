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
  // The body is the org's GetLead API key. The generic hook logs `request.body`
  // verbatim, which would put a live credential in the audit table in plaintext;
  // the handler records a sanitised "GetLead connected" event instead.
  "/api/integration/external/getlead/connect",
]);

/**
 * Skips keyed by method as well as route, for a path where only one verb records
 * its own event. `"/api/contact/conversations/:conversationId"` is both the ticket
 * edit (worth logging generically) and the delete (which records a richer event of
 * its own), so the route alone cannot decide.
 */
const SKIPPED_METHOD_ROUTES = new Set([
  // Deleting a conversation records its own event, naming the contact and ticket.
  // The generic hook cannot: the rows are gone by the time it runs, and all it
  // would write is the conversation id (or, for the bulk route, a list of them).
  "DELETE /api/contact/conversations/:conversationId",
  "DELETE /api/contact/conversations/",
]);

export const REDACTED = "[redacted]";

// Field names are compared lower-cased with `_`/`-` removed, so `api_key`, `apiKey`
// and `API-KEY` all match. Any name containing one of these is withheld...
const SENSITIVE_FRAGMENTS = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "accesskey",
  "privatekey",
  "authorization",
  "cookie",
  "credential",
];
// ...and these only as the whole name, since they are too short to match inside
// others (`key` would catch `keyword`, `pin` would catch `shipping`).
const SENSITIVE_NAMES = new Set(["key", "otp", "pin", "pwd", "cvv"]);

/** A body larger than this is recorded as its field names only. */
const MAX_BODY_CHARS = 4000;

function isSensitiveField(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[-_]/g, "");
  // `promptTokens`, `maxTokens`: AI usage counts, not credentials.
  if (normalized.endsWith("tokens")) return false;
  return (
    SENSITIVE_NAMES.has(normalized) ||
    SENSITIVE_FRAGMENTS.some((fragment) => normalized.includes(fragment))
  );
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value === null || typeof value !== "object") return value;
  // Uploads and streams (multipart bodies) are not data worth keeping in a log.
  if (Buffer.isBuffer(value) || typeof (value as { pipe?: unknown }).pipe === "function") {
    return "[binary]";
  }
  if (value instanceof Date) return value.toISOString();
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([name, field]) => [
      name,
      isSensitiveField(name) ? REDACTED : redactValue(field),
    ]),
  );
}

/**
 * The version of a request body that is safe to keep in the audit log: every field
 * whose name looks like a credential (at any depth) is replaced with `[redacted]`,
 * and an oversized body (an import, a campaign payload) is cut down to its field
 * names. Team Activity is readable by admins, so nothing here may be a live secret.
 * It matches on names, so a credential under an innocuous name still gets through:
 * a route with one of those records its own event (`recordAuditEvent`) or is skipped.
 */
export function redactAuditBody(body: unknown): unknown {
  if (body === null || body === undefined) return {};
  const redacted = redactValue(body);
  if (JSON.stringify(redacted).length <= MAX_BODY_CHARS) return redacted;
  return {
    note: "Too large to record",
    fields:
      redacted && typeof redacted === "object" && !Array.isArray(redacted)
        ? Object.keys(redacted)
        : [],
  };
}

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
        body: redactAuditBody(body) as object,
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
  if (routePattern && SKIPPED_METHOD_ROUTES.has(`${request.method} ${routePattern}`)) return;

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
        body: redactAuditBody(request.body) as object,
        orgId: request.user?.orgId ?? null,
      },
    });
  } catch (err) {
    request.log.error({ err }, "Failed to record audit log");
  }
}
