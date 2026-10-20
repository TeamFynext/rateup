import type { FastifyReply, FastifyRequest } from "fastify";

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";

/**
 * The per-key request log behind the console's usage view.
 *
 * Off the request path: each answered call is pushed onto an in-process buffer and written
 * with one `createMany` per batch. The API and Postgres share a region, so a batch insert
 * from here is cheaper than a queue hop to the worker service in another one. The price is
 * that a crash loses up to one flush interval of rows — acceptable for a usage chart, which
 * is why billing must never be computed from this table.
 */

const FLUSH_EVERY_MS = 5_000;
const FLUSH_AT_ROWS = 500;
/** If Postgres is down, stop growing rather than eat the process's memory. */
const MAX_BUFFERED_ROWS = 20_000;
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

export async function flushApiUsage(): Promise<void> {
  if (buffer.length === 0) return;
  const rows = buffer;
  buffer = [];
  try {
    await prisma.apiRequestLog.createMany({ data: rows });
  } catch (err) {
    log.warn({ err, rows: rows.length }, "Could not write API usage rows; dropping them");
  }
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = undefined;
    void flushApiUsage();
  }, FLUSH_EVERY_MS);
  timer.unref();
}

export function recordApiUsage(row: UsageRow) {
  if (buffer.length >= MAX_BUFFERED_ROWS) return;
  buffer.push(row);
  if (buffer.length >= FLUSH_AT_ROWS) void flushApiUsage();
  else schedule();
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
