import type { FastifyReply, FastifyRequest } from "fastify";

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import redis from "../../utils/redisConnection.js";

/**
 * The per-key request log behind the console's usage view.
 *
 * Nothing here touches Postgres on the API: each answered call is buffered in process for
 * a moment, then pushed onto a Redis list in one round trip. The bullmq worker's
 * `apiUsageFlush` job (every ten seconds) drains the list into `ApiRequestLog` with batch
 * inserts. A crash loses at most the in-process moment; a worker that is down only lets the
 * list grow, up to a cap. Acceptable for a usage chart, which is why billing must never be
 * computed from this table.
 */

export const API_USAGE_QUEUE_KEY = "apiUsage:pending";
const PUSH_EVERY_MS = 1_000;
const PUSH_AT_ROWS = 200;
/** If Redis is unreachable, stop growing rather than eat the process's memory. */
const MAX_BUFFERED_ROWS = 20_000;
/** If the worker is down, keep the newest rows only. */
const MAX_QUEUED_ROWS = 500_000;
/** Rows the worker writes per insert, and inserts per tick. */
const DRAIN_BATCH = 1_000;
const DRAIN_BATCHES_PER_TICK = 20;
export const API_USAGE_RETENTION_DAYS = 30;

interface UsageRow {
  orgId: string;
  keyId: string;
  method: string;
  route: string;
  status: number;
  latencyMs: number;
  createdAt: Date;
}

let buffer: UsageRow[] = [];
let timer: NodeJS.Timeout | undefined;

/** Hands the buffered rows to Redis for the worker. Never throws. */
export async function flushApiUsage(): Promise<void> {
  if (buffer.length === 0) return;
  const rows = buffer;
  buffer = [];
  try {
    await redis
      .multi()
      .rpush(API_USAGE_QUEUE_KEY, ...rows.map((row) => JSON.stringify(row)))
      .ltrim(API_USAGE_QUEUE_KEY, -MAX_QUEUED_ROWS, -1)
      .exec();
  } catch (err) {
    log.warn({ err, rows: rows.length }, "Could not queue API usage rows; dropping them");
  }
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = undefined;
    void flushApiUsage();
  }, PUSH_EVERY_MS);
  timer.unref();
}

export function recordApiUsage(row: UsageRow) {
  if (buffer.length >= MAX_BUFFERED_ROWS) return;
  // A latency that is not a number would fail the whole batch's insert on the worker.
  buffer.push({ ...row, latencyMs: Number.isFinite(row.latencyMs) ? row.latencyMs : 0 });
  if (buffer.length >= PUSH_AT_ROWS) void flushApiUsage();
  else schedule();
}

/**
 * The worker side: moves queued rows into `ApiRequestLog`. A batch that fails to insert is
 * put back for the next tick once; a row that cannot be parsed is dropped.
 */
export async function drainApiUsage(): Promise<{ written: number; failed: number }> {
  let written = 0;
  let failed = 0;
  for (let batch = 0; batch < DRAIN_BATCHES_PER_TICK; batch++) {
    const raw = await redis.lpop(API_USAGE_QUEUE_KEY, DRAIN_BATCH);
    if (!raw?.length) break;
    const rows = raw.flatMap((entry) => {
      try {
        const row = JSON.parse(entry) as UsageRow;
        return [{ ...row, createdAt: new Date(row.createdAt) }];
      } catch {
        return [];
      }
    });
    try {
      await prisma.apiRequestLog.createMany({ data: rows });
      written += rows.length;
    } catch (err) {
      failed += rows.length;
      log.warn({ err, rows: rows.length }, "Could not write API usage rows; retrying next tick");
      await redis.rpush(API_USAGE_QUEUE_KEY, ...raw).catch(() => undefined);
      break;
    }
    if (raw.length < DRAIN_BATCH) break;
  }
  return { written, failed };
}

/**
 * `onResponse` for the external API. Only authenticated calls are logged: an unauthenticated
 * caller must not be able to write rows into an org's usage just by naming it in the URL.
 */
export function apiUsageOnResponse(prefix: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = request.apiKey;
    const orgId = request.user?.orgId;
    if (!key || !orgId) return;
    const pattern = request.routeOptions.url ?? "";
    recordApiUsage({
      orgId,
      keyId: key.id,
      method: request.method,
      route: pattern.startsWith(prefix) ? pattern.slice(prefix.length) || "/" : pattern,
      status: reply.statusCode,
      latencyMs: Math.round(reply.elapsedTime),
      createdAt: new Date(),
    });
  };
}

export async function sweepOldApiUsage(): Promise<number> {
  const { count } = await prisma.apiRequestLog.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - API_USAGE_RETENTION_DAYS * 86_400_000) } },
  });
  return count;
}

/** The console's usage chart: per-day totals by key and status class. */
export async function getApiUsage(
  orgId: string,
  { days = 14, keyId }: { days?: number; keyId?: string },
) {
  const since = new Date(Date.now() - days * 86_400_000);
  const daily = await prisma.$queryRaw<
    {
      day: Date;
      keyId: string | null;
      ok: bigint;
      clientErrors: bigint;
      serverErrors: bigint;
      p95LatencyMs: number | null;
    }[]
  >`
    SELECT date_trunc('day', "createdAt") AS day, "keyId",
      count(*) FILTER (WHERE status < 400) AS ok,
      count(*) FILTER (WHERE status >= 400 AND status < 500) AS "clientErrors",
      count(*) FILTER (WHERE status >= 500) AS "serverErrors",
      percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") AS "p95LatencyMs"
    FROM "ApiRequestLog"
    WHERE "orgId" = ${orgId}::uuid AND "createdAt" >= ${since}
      AND (${keyId ?? null}::uuid IS NULL OR "keyId" = ${keyId ?? null}::uuid)
    GROUP BY 1, 2
    ORDER BY 1`;
  return {
    daily: daily.map((d) => ({
      day: d.day.toISOString().slice(0, 10),
      keyId: d.keyId,
      ok: Number(d.ok),
      clientErrors: Number(d.clientErrors),
      serverErrors: Number(d.serverErrors),
      p95LatencyMs: d.p95LatencyMs === null ? null : Math.round(Number(d.p95LatencyMs)),
    })),
  };
}

/**
 * One page of the request log, newest first. Keyset on the autoincrement id, so a page costs an
 * index range scan however far back the reader goes, and rows written while they page neither
 * repeat nor go missing. The cursor is the last id of the page before, as a string (it is a
 * BigInt), and is opaque to the console.
 */
export async function listApiRequests(
  orgId: string,
  { keyId, cursor, limit }: { keyId?: string; cursor?: string; limit: number },
) {
  const rows = await prisma.apiRequestLog.findMany({
    where: {
      orgId,
      ...(keyId ? { keyId } : {}),
      ...(cursor ? { id: { lt: BigInt(cursor) } } : {}),
    },
    select: {
      id: true,
      keyId: true,
      method: true,
      route: true,
      status: true,
      latencyMs: true,
      createdAt: true,
    },
    orderBy: { id: "desc" },
    take: limit + 1,
  });
  const page = rows.slice(0, limit);
  return {
    data: page.map(({ id, createdAt, ...row }) => ({
      id: id.toString(),
      ...row,
      createdAt: createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit ? page.at(-1)!.id.toString() : null,
  };
}
