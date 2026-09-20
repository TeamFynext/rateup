import { createHash } from "node:crypto";
import { log } from "./logger.js";
import connection from "./redisConnection.js";

/**
 * A short-lived read-through cache in front of expensive, read-only aggregates.
 *
 * It is bounded by TTL alone — nothing invalidates it on write. That is deliberate:
 * write-time bookkeeping is how the `InboxStats` counters drifted and were abandoned.
 * So it only suits numbers where being a minute behind is fine (a dashboard), never
 * anything a user expects to change the moment they act (an inbox badge).
 *
 * It fails open. Redis being down, slow, or holding something unreadable must cost
 * a cache miss and nothing else: the caller's `load()` result is what gets returned.
 */

/** Set to "true" to switch every `withCache` call to a straight `load()`. */
function cacheDisabled(): boolean {
  return process.env.ANALYTICS_CACHE_DISABLED === "true";
}

/**
 * How long a cache read may take before it is treated as a miss.
 *
 * The shared connection is built with `maxRetriesPerRequest: null` for BullMQ, which
 * also means a command issued while Redis is unreachable is queued and never
 * rejects. Without a deadline a Redis outage would hang every cached endpoint
 * instead of merely un-caching it.
 */
const READ_DEADLINE_MS = 250;

/** Identical requests already being loaded on this process, keyed like the cache. */
const inFlight = new Map<string, Promise<unknown>>();

function redisReady(): boolean {
  return connection.status === "ready";
}

async function readCached<T>(key: string): Promise<{ hit: true; value: T } | { hit: false }> {
  if (!redisReady()) return { hit: false };
  let timer: NodeJS.Timeout | undefined;
  try {
    const raw = await Promise.race([
      connection.get(key),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("cache read timed out")), READ_DEADLINE_MS);
      }),
    ]);
    if (raw === null) return { hit: false };
    return { hit: true, value: JSON.parse(raw) as T };
  } catch (error) {
    log.warn({ err: error, key }, "Cache read failed; loading from the source");
    return { hit: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function writeCached(key: string, ttlSeconds: number, value: unknown) {
  if (!redisReady()) return;
  let serialized: string | undefined;
  try {
    // `undefined`, a BigInt, or a cycle cannot be stored. None of that is an error
    // for the caller, who already has their value.
    serialized = JSON.stringify(value);
  } catch (error) {
    log.warn({ err: error, key }, "Cache value is not serialisable; not caching it");
    return;
  }
  if (serialized === undefined) return;
  connection.set(key, serialized, "EX", ttlSeconds).catch((error: unknown) => {
    log.warn({ err: error, key }, "Cache write failed");
  });
}

export interface WithCacheOptions {
  /** Skip the read and refresh the entry — a user asked for fresh numbers. */
  bypass?: boolean;
}

/**
 * Returns the cached value for `key`, or runs `load()`, stores its result for
 * `ttlSeconds`, and returns that.
 *
 * A hit returns the value as it survived a JSON round trip (dates as ISO strings,
 * decimals as strings). That is exactly what `reply.send` would have made of the
 * original, so a response is the same bytes either way — but do not use this for a
 * value whose type matters to the code that receives it.
 *
 * Concurrent calls for the same key on one process share a single `load()`.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
  options: WithCacheOptions = {},
): Promise<T> {
  if (cacheDisabled() || ttlSeconds <= 0) return load();

  if (!options.bypass) {
    const cached = await readCached<T>(key);
    if (cached.hit) return cached.value;

    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const loading = load().then((value) => {
    writeCached(key, ttlSeconds, value);
    return value;
  });
  // A failed load is not cached and must not poison the next caller, so the entry
  // goes whether the promise settles well or badly.
  const tracked = loading.finally(() => {
    if (inFlight.get(key) === tracked) inFlight.delete(key);
  });
  inFlight.set(key, tracked);
  return tracked;
}

/**
 * A cache key for one org's view of one endpoint under one set of parameters.
 *
 * The org comes first and in the clear so one tenant's entries can be found (or
 * flushed) by prefix, and so a key can never be shared across tenants. The
 * parameters are hashed because they are unbounded; their keys are sorted so the
 * same parameters always hash the same whatever order they were written in.
 */
export function cacheKeyFor(
  namespace: string,
  orgId: string,
  endpoint: string,
  params: Record<string, unknown>,
): string {
  const canonical = JSON.stringify(
    Object.keys(params)
      .sort()
      .filter((name) => params[name] !== undefined)
      .map((name) => [name, params[name]]),
  );
  const digest = createHash("sha1").update(canonical).digest("hex");
  return `${namespace}:${orgId}:${endpoint}:${digest}`;
}
