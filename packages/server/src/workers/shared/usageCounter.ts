// Per-org usage counters, buffered in Redis and flushed to `UsageStats` in bulk.
//
// Every campaign send used to run `UPDATE "UsageStats" SET "messagesCount" =
// "messagesCount" + 1` as the first statement of its bookkeeping transaction.
// `UsageStats` is one row per org, so every concurrent send for that org queued
// on the same row lock, and held it until its whole transaction committed. A
// campaign is by definition thousands of sends for one org.
//
// Now a send does `HINCRBY usage:<orgId> messagesCount 1` and marks the org
// dirty; the `usageFlush` scheduled job (every ten seconds) drains each dirty
// hash and applies it as one `UPDATE ... SET x = x + n` per org. Nothing is held
// in process memory, so a worker restart loses nothing; a failed UPDATE puts the
// counts back for the next tick.
//
// Only counters nothing *enforces* belong here. `messagesCount` is lifetime
// volume read by the admin and staff dashboards; ten seconds of lag there is
// invisible. The enforced meters — `campaignCreditsUsed` (consumeCampaignCredit)
// and the active-contact meter — must stay as their conditional UPDATEs, which
// are what stop concurrent sends overspending.
import type { Redis } from "ioredis";

import dbPool from "../../utils/db.js";
import { log } from "./logger.js";

/**
 * Columns that may be buffered. A whitelist rather than free text because the
 * names are interpolated into SQL — and because each one added must be checked
 * for readers that enforce a limit against it.
 */
export const BUFFERED_USAGE_FIELDS = ["messagesCount"] as const;
export type BufferedUsageField = (typeof BUFFERED_USAGE_FIELDS)[number];

const FIELD_SET: ReadonlySet<string> = new Set(BUFFERED_USAGE_FIELDS);

export const USAGE_DIRTY_KEY = "usage:dirty";
export const usageKey = (orgId: string) => `usage:${orgId}`;

/** Orgs drained per flush. The rest stay dirty and go next tick. */
const FLUSH_BATCH = 500;

/**
 * HGETALL + DEL as one step, so an increment landing mid-flush is either in
 * this drain or left for the next one — never read and then deleted unseen.
 */
const DRAIN_HASH_SCRIPT = `
local h = redis.call('HGETALL', KEYS[1])
if #h > 0 then redis.call('DEL', KEYS[1]) end
return h
`;

/** The subset of ioredis this module uses, so tests can pass a fake. */
export type UsageRedis = Pick<Redis, "multi" | "spop" | "eval">;

export interface UsageDelta {
  orgId: string;
  counts: Partial<Record<BufferedUsageField, number>>;
}

/**
 * Applies one org's delta. The default is a single UPDATE on the raw pool —
 * no transaction, so no lock held beyond the statement. Like the statement it
 * replaces, it touches an existing row only: an org without `UsageStats` is
 * not given one here.
 */
export type ApplyUsageDelta = (delta: UsageDelta) => Promise<void>;

export const applyUsageDeltaToDb: ApplyUsageDelta = async ({ orgId, counts }) => {
  const fields = Object.keys(counts).filter((f) => FIELD_SET.has(f)) as BufferedUsageField[];
  if (fields.length === 0) return;
  const sets = fields.map((f, i) => `"${f}" = "${f}" + $${i + 2}`).join(", ");
  await dbPool.query(`UPDATE "UsageStats" SET ${sets} WHERE "orgId" = $1`, [
    orgId,
    ...fields.map((f) => counts[f]),
  ]);
};

/**
 * Counts one unit of usage. Never throws: a usage counter must not fail a send
 * that has already happened. If Redis is unreachable the increment goes
 * straight to the database, as it did before buffering existed.
 */
export async function incrementUsage(
  redis: UsageRedis,
  orgId: string,
  field: BufferedUsageField,
  by = 1,
  fallback: ApplyUsageDelta = applyUsageDeltaToDb,
): Promise<void> {
  try {
    // One MULTI so the count and the dirty mark land together: a flush can
    // never see the hash without the mark that leads it there.
    const res = await redis
      .multi()
      .hincrby(usageKey(orgId), field, by)
      .sadd(USAGE_DIRTY_KEY, orgId)
      .exec();
    const failed = res?.find(([err]) => err);
    if (!res || failed) throw failed?.[0] ?? new Error("usage MULTI aborted");
    return;
  } catch (err) {
    log.warn({ err, orgId, field }, "Usage counter: Redis unavailable, writing directly");
  }
  try {
    await fallback({ orgId, counts: { [field]: by } });
  } catch (err) {
    log.error({ err, orgId, field, by }, "Usage counter: increment lost");
  }
}

function parseHash(flat: unknown): UsageDelta["counts"] {
  const counts: UsageDelta["counts"] = {};
  if (!Array.isArray(flat)) return counts;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const field = String(flat[i]);
    const n = Number.parseInt(String(flat[i + 1]), 10);
    if (!FIELD_SET.has(field)) {
      log.warn({ field }, "Usage counter: dropping unknown field");
      continue;
    }
    if (Number.isFinite(n) && n !== 0) counts[field as BufferedUsageField] = n;
  }
  return counts;
}

/** Puts a delta back so the next flush applies it. */
async function restoreUsage(redis: UsageRedis, { orgId, counts }: UsageDelta) {
  const tx = redis.multi();
  for (const [field, n] of Object.entries(counts)) tx.hincrby(usageKey(orgId), field, n);
  tx.sadd(USAGE_DIRTY_KEY, orgId);
  await tx.exec();
}

/**
 * A data error (bad uuid, overflow) will fail the same way forever; putting
 * it back would retry it every ten seconds for good.
 */
function isPermanentDbError(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  return typeof code === "string" && code.startsWith("22");
}

export interface UsageFlushResult {
  orgs: number;
  applied: number;
  restored: number;
  dropped: number;
}

/**
 * Drains up to `FLUSH_BATCH` dirty orgs and applies each one's delta. Run from
 * the `usageFlush` scheduled job; safe to run concurrently with itself (each
 * SPOP hands an org to exactly one flusher) and with increments.
 */
export async function flushUsageCounters(
  redis: UsageRedis,
  apply: ApplyUsageDelta = applyUsageDeltaToDb,
  batch = FLUSH_BATCH,
): Promise<UsageFlushResult> {
  const result: UsageFlushResult = { orgs: 0, applied: 0, restored: 0, dropped: 0 };
  const orgIds = (await redis.spop(USAGE_DIRTY_KEY, batch)) as string[] | null;
  if (!orgIds?.length) return result;
  result.orgs = orgIds.length;

  for (const orgId of orgIds) {
    let delta: UsageDelta;
    try {
      delta = { orgId, counts: parseHash(await redis.eval(DRAIN_HASH_SCRIPT, 1, usageKey(orgId))) };
    } catch (err) {
      // Nothing was deleted if the script failed; re-mark so it is not orphaned.
      log.error({ err, orgId }, "Usage counter: drain failed");
      await redis
        .multi()
        .sadd(USAGE_DIRTY_KEY, orgId)
        .exec()
        .catch(() => {});
      continue;
    }
    if (Object.keys(delta.counts).length === 0) continue;

    try {
      await apply(delta);
      result.applied++;
    } catch (err) {
      if (isPermanentDbError(err)) {
        log.error({ err, ...delta }, "Usage counter: delta rejected by the database, dropped");
        result.dropped++;
        continue;
      }
      try {
        await restoreUsage(redis, delta);
        result.restored++;
        log.warn({ err, orgId }, "Usage counter: flush failed, counts put back");
      } catch (restoreErr) {
        // Redis took the counts and will not take them back. Log them in full
        // so they can be applied by hand.
        log.error({ err, restoreErr, ...delta }, "Usage counter: counts lost");
        result.dropped++;
      }
    }
  }
  return result;
}
