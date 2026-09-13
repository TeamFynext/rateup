import { createHash } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { ExternalApiError } from "./errors.js";

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
 * A caller sends `Idempotency-Key` on every write. The mobile cashier's outbox already
 * mints a UUID per queued item for exactly this purpose.
 */

const TTL_HOURS = 24;
/** Long enough for a UUID or a `shopify:<shop>:<order>` key; bounded so it cannot be abused as storage. */
const KEY_PATTERN = /^[A-Za-z0-9_.:@-]{8,200}$/;

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

function hashBody(body: unknown): string {
  return createHash("sha256")
    .update(canonicalise(body ?? {}))
    .digest("hex");
}

export function readIdempotencyKey(request: FastifyRequest): string {
  const raw = request.headers["idempotency-key"];
  const key = Array.isArray(raw) ? raw[0] : raw;
  if (!key) {
    throw new ExternalApiError(
      400,
      "idempotency_key_missing",
      "Every write needs an Idempotency-Key header",
    );
  }
  if (!KEY_PATTERN.test(key)) {
    throw new ExternalApiError(
      400,
      "idempotency_key_invalid",
      "Idempotency-Key must be 8-200 characters of A-Z a-z 0-9 _ . : @ -",
    );
  }
  return key;
}

export async function idempotencyPreHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!MUTATING.has(request.method.toUpperCase())) return;

  const orgId = request.user?.orgId;
  if (!orgId) return;

  const key = readIdempotencyKey(request);
  const scope = `${request.method} ${request.routeOptions?.url ?? request.url}`;
  const requestHash = hashBody(request.body);

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
  return reply.code(existing.responseStatus ?? 200).send(existing.responseBody);
}

/** Stores the answer, so the next identical call can be given it without redoing the work. */
export async function idempotencyOnSend(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown,
) {
  const claim = request.idempotency;
  if (!claim) return payload;

  const status = reply.statusCode;
  try {
    if (status >= 200 && status < 300) {
      await prisma.externalIdempotencyRecord.updateMany({
        where: { orgId: claim.orgId, scope: claim.scope, key: claim.key, state: "IN_FLIGHT" },
        data: {
          state: "COMPLETED",
          responseStatus: status,
          responseBody: typeof payload === "string" ? JSON.parse(payload) : payload,
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
  return payload;
}

/** Drops expired records. Called from the loyalty cron. */
export async function sweepExpiredIdempotencyRecords(): Promise<number> {
  const { count } = await prisma.externalIdempotencyRecord.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
