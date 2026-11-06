import { createHash } from "node:crypto";
import type { FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import z, { ZodObject } from "zod";

import { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { ExternalApiError, IDEMPOTENCY_KEY_INVALID_MESSAGE } from "./errors.js";

/**
 * Making a retried partner write safe.
 *
 * There are two layers, and they cover different things.
 *
 * `LoyaltyTransaction.idempotencyKey` is the durable one: it lives in the ledger, it is
 * enforced by a unique index inside the same transaction as the balance change, and it can
 * never disagree with the points it guards. But it only exists for writes that book a
 * transaction. Applying a voucher or sending a card moves no points and leaves no row to
 * collapse onto.
 *
 * This is the other layer — a short-lived record of "this key, on this route, already got
 * this answer". It covers everything, and it expires; when the two overlap, the ledger is
 * the one that decides.
 *
 * Mounted once at each version root, so every write on the partner API is covered. The header
 * is optional everywhere: a write that carries one is claimed and replayed on retry, and one
 * without goes straight through. That makes it the caller's choice — and on a send or a points
 * write, a retry without a key repeats the message or the award. The mobile cashier's outbox
 * mints a UUID per queued item for exactly this purpose.
 */

const TTL_HOURS = 24;
/** Long enough for a UUID or a `shopify:<shop>:<order>` key; bounded so it cannot be abused as storage. */
const KEY_PATTERN = /^[A-Za-z0-9_.:@-]{8,200}$/;

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const keyHeader = z
  .string()
  .regex(KEY_PATTERN)
  .describe(
    "A unique value per operation (a UUID is ideal), 8–200 of `A-Z a-z 0-9 _ . : @ -`. " +
      "Send the same value to retry: the first answer is replayed, marked " +
      "`Idempotent-Replay: true`, and nothing is done twice. Remembered for 24 hours. " +
      "Optional, but without it a retried send or points write happens twice.",
  );

const isWrite = (route: Pick<RouteOptions, "method">) =>
  (Array.isArray(route.method) ? route.method : [route.method]).some((m) =>
    MUTATING.has(m.toUpperCase()),
  );

/**
 * Puts the optional `Idempotency-Key` on a write route's `headers` schema, so the published
 * reference lists it beside the body. Merges with any headers the route already declares. A
 * malformed key then fails header validation, which the error handler answers as
 * `idempotency_key_invalid` — the same code the preHandler uses.
 */
export function documentIdempotencyHeader(route: RouteOptions) {
  if (!isWrite(route)) return;
  const schema = (route.schema ??= {});
  const existing = schema.headers instanceof ZodObject ? schema.headers : z.object({});
  schema.headers = existing.extend({ "idempotency-key": keyHeader.optional() });
}

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `idempotencyPreHandler` when it has claimed a record for this write. */
    idempotency?: { orgId: string; scope: string; key: string };
  }
}

/** Stable across key order, so the same body always hashes the same way. */
function canonicalise(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalise(v)}`).join(",")}}`;
}

const isEmpty = (value: unknown) =>
  value == null || (typeof value === "object" && Object.keys(value).length === 0);

/**
 * What a key is bound to besides method and route pattern: the body, and the path params and
 * query, so the same key and body sent to `/rewards/A/issue` and then `/rewards/B/issue` is a
 * different request, not a replay of the first. A request with neither params nor query
 * hashes its body alone, as before, so records written before params counted still match.
 */
function hashRequest(request: FastifyRequest): string {
  const { body, params, query } = request;
  const subject =
    isEmpty(params) && isEmpty(query) ? (body ?? {}) : { body: body ?? {}, params, query };
  return createHash("sha256").update(canonicalise(subject)).digest("hex");
}

/** The request's key, or undefined when it sent none. */
function readIdempotencyKey(request: FastifyRequest): string | undefined {
  const raw = request.headers["idempotency-key"];
  const key = Array.isArray(raw) ? raw[0] : raw;
  if (!key) return undefined;
  if (!KEY_PATTERN.test(key)) {
    throw new ExternalApiError(400, "idempotency_key_invalid", IDEMPOTENCY_KEY_INVALID_MESSAGE);
  }
  return key;
}

export async function idempotencyPreHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!MUTATING.has(request.method.toUpperCase())) return;

  const orgId = request.user?.orgId;
  if (!orgId) return;

  // No key: the caller has chosen not to make this write retry-safe.
  const key = readIdempotencyKey(request);
  if (!key) return;
  const scope = `${request.method} ${request.routeOptions?.url ?? request.url}`;
  const requestHash = hashRequest(request);

  try {
    await prisma.externalIdempotencyRecord.create({
      data: {
        orgId,
        scope,
        key,
        requestHash,
        state: "IN_FLIGHT",
        expiresAt: new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000),
      },
    });
    request.idempotency = { orgId, scope, key };
    return;
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
  }

  const existing = await prisma.externalIdempotencyRecord.findUnique({
    where: { orgId_scope_key: { orgId, scope, key } },
  });
  if (!existing) {
    // Raced with the sweeper between the failed insert and this read. Treat it as a fresh
    // request; the ledger's own key still protects anything that moves points.
    request.idempotency = { orgId, scope, key };
    return;
  }

  if (existing.requestHash !== requestHash) {
    // Stripe's rule, and the safe one: a key is bound to the request that created it.
    // Replaying a different body under it would answer the wrong question.
    throw new ExternalApiError(
      409,
      "idempotency_key_reused",
      "That Idempotency-Key was already used for a different request",
    );
  }

  if (existing.state !== "COMPLETED") {
    reply.header("Retry-After", "1");
    throw new ExternalApiError(
      409,
      "request_in_progress",
      "An identical request is still being processed",
    );
  }

  reply.header("Idempotent-Replay", "true");
  return reply.code(existing.responseStatus ?? 200).send(existing.responseBody ?? undefined);
}

/** Stores the answer, so the next identical call can be given it without redoing the work. */
/**
 * Records the outcome against the claim taken in `idempotencyPreHandler`.
 *
 * Callback-style on purpose, finishing synchronously when there is no claim (every read, and
 * every write sent without a key). An async onSend hook defers the send, so a handler that
 * calls `reply.send()` without returning it resolves first; Fastify then sees an unanswered
 * reply, tries again, and marks the request a 500 after the 200 already went out. Plenty of
 * the dashboard handlers v1 forwards to are written that way.
 */
export function idempotencyOnSend(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown,
  done: (err: Error | null, payload?: unknown) => void,
) {
  const claim = request.idempotency;
  if (!claim) return done(null, payload);
  recordOutcome(claim, reply.statusCode, payload).then(() => done(null, payload));
}

async function recordOutcome(
  claim: NonNullable<FastifyRequest["idempotency"]>,
  status: number,
  payload: unknown,
) {
  try {
    if (status >= 200 && status < 300) {
      await prisma.externalIdempotencyRecord.updateMany({
        where: { orgId: claim.orgId, scope: claim.scope, key: claim.key, state: "IN_FLIGHT" },
        data: {
          state: "COMPLETED",
          responseStatus: status,
          // A 204 has no body; storing null still completes the record, where JSON.parse("")
          // would throw and leave it IN_FLIGHT, answering every retry with 409 for a day.
          responseBody:
            typeof payload === "string"
              ? payload
                ? JSON.parse(payload)
                : Prisma.DbNull
              : (payload ?? Prisma.DbNull),
          completedAt: new Date(),
        },
      });
    } else {
      // A failed write leaves nothing to replay, and the caller may well fix the problem
      // and try again with the same key. Releasing it is what lets them.
      await prisma.externalIdempotencyRecord.deleteMany({
        where: { orgId: claim.orgId, scope: claim.scope, key: claim.key, state: "IN_FLIGHT" },
      });
    }
  } catch (err) {
    // Never fail a request that already succeeded because bookkeeping did not.
    log.error({ err, scope: claim.scope }, "Could not record an idempotency outcome");
  }
}

/** Drops expired records. Called from the loyalty cron. */
export async function sweepExpiredIdempotencyRecords(): Promise<number> {
  const { count } = await prisma.externalIdempotencyRecord.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
