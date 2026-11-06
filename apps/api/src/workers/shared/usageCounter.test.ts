import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/db.js", () => ({ default: { query: vi.fn(async () => ({})) } }));
vi.mock("./logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import dbPool from "../../utils/db.js";
import {
  applyUsageDeltaToDb,
  flushUsageCounters,
  incrementUsage,
  USAGE_DIRTY_KEY,
  usageKey,
  type UsageDelta,
  type UsageRedis,
} from "./usageCounter.js";

/**
 * Just enough Redis for the counter: hashes, one set, MULTI and the drain
 * script (HGETALL + DEL). `down` makes every command reject.
 */
function fakeRedis() {
  const hashes = new Map<string, Map<string, number>>();
  const sets = new Map<string, Set<string>>();
  const state = { down: false };

  const hincrby = (key: string, field: string, by: number) => {
    const h = hashes.get(key) ?? new Map<string, number>();
    h.set(field, (h.get(field) ?? 0) + by);
    hashes.set(key, h);
  };
  const sadd = (key: string, member: string) => {
    const s = sets.get(key) ?? new Set<string>();
    s.add(member);
    sets.set(key, s);
  };

  const redis = {
    multi() {
      const ops: Array<() => void> = [];
      const tx = {
        hincrby(key: string, field: string, by: number) {
          ops.push(() => hincrby(key, field, by));
          return tx;
        },
        sadd(key: string, member: string) {
          ops.push(() => sadd(key, member));
          return tx;
        },
        async exec() {
          if (state.down) throw new Error("ECONNREFUSED");
          ops.forEach((op) => op());
          return ops.map(() => [null, 1]);
        },
      };
      return tx;
    },
    async spop(key: string, count: number) {
      if (state.down) throw new Error("ECONNREFUSED");
      const s = sets.get(key) ?? new Set<string>();
      const out = [...s].slice(0, count);
      out.forEach((m) => s.delete(m));
      return out;
    },
    async eval(_script: string, _n: number, key: string) {
      if (state.down) throw new Error("ECONNREFUSED");
      const h = hashes.get(key);
      hashes.delete(key);
      return h ? [...h.entries()].flatMap(([f, v]) => [f, String(v)]) : [];
    },
  };

  return { redis: redis as unknown as UsageRedis, hashes, sets, state };
}

describe("usage counters", () => {
  beforeEach(() => vi.clearAllMocks());

  test("increments buffer in Redis and mark the org dirty", async () => {
    const { redis, hashes, sets } = fakeRedis();
    await incrementUsage(redis, "org1", "messagesCount");
    await incrementUsage(redis, "org1", "messagesCount");
    await incrementUsage(redis, "org2", "messagesCount");

    expect(hashes.get(usageKey("org1"))?.get("messagesCount")).toBe(2);
    expect([...(sets.get(USAGE_DIRTY_KEY) ?? [])].sort()).toEqual(["org1", "org2"]);
    expect(dbPool.query).not.toHaveBeenCalled();
  });

  test("falls back to the database when Redis is down, and never throws", async () => {
    const { redis, state } = fakeRedis();
    state.down = true;
    const fallback = vi.fn(async () => {});

    await incrementUsage(redis, "org1", "messagesCount", 1, fallback);
    expect(fallback).toHaveBeenCalledWith({ orgId: "org1", counts: { messagesCount: 1 } });

    fallback.mockRejectedValueOnce(new Error("db down too"));
    await expect(incrementUsage(redis, "org1", "messagesCount", 1, fallback)).resolves.toBe(
      undefined,
    );
  });

  test("a flush applies one summed delta per org and clears what it applied", async () => {
    const { redis, hashes, sets } = fakeRedis();
    for (let i = 0; i < 5; i++) await incrementUsage(redis, "org1", "messagesCount");
    await incrementUsage(redis, "org2", "messagesCount", 3);
    const applied: UsageDelta[] = [];

    const result = await flushUsageCounters(redis, async (d) => {
      applied.push(d);
    });

    expect(result).toEqual({ orgs: 2, applied: 2, restored: 0, dropped: 0 });
    expect(applied.sort((a, b) => a.orgId.localeCompare(b.orgId))).toEqual([
      { orgId: "org1", counts: { messagesCount: 5 } },
      { orgId: "org2", counts: { messagesCount: 3 } },
    ]);
    expect(hashes.size).toBe(0);
    expect(sets.get(USAGE_DIRTY_KEY)?.size ?? 0).toBe(0);
  });

  test("a failed UPDATE puts the counts back, merged with any that arrived since", async () => {
    const { redis, hashes, sets } = fakeRedis();
    await incrementUsage(redis, "org1", "messagesCount", 4);

    const result = await flushUsageCounters(redis, async () => {
      // A send lands while the flush is mid-UPDATE.
      await incrementUsage(redis, "org1", "messagesCount", 1);
      throw Object.assign(new Error("connection terminated"), { code: "57P01" });
    });

    expect(result.restored).toBe(1);
    expect(hashes.get(usageKey("org1"))?.get("messagesCount")).toBe(5);
    expect(sets.get(USAGE_DIRTY_KEY)?.has("org1")).toBe(true);

    // The next tick applies the lot.
    const apply = vi.fn(async () => {});
    await flushUsageCounters(redis, apply);
    expect(apply).toHaveBeenCalledWith({ orgId: "org1", counts: { messagesCount: 5 } });
  });

  test("a data error is dropped rather than retried forever", async () => {
    const { redis, hashes } = fakeRedis();
    await incrementUsage(redis, "not-a-uuid", "messagesCount");

    const result = await flushUsageCounters(redis, async () => {
      throw Object.assign(new Error("invalid input syntax for type uuid"), { code: "22P02" });
    });

    expect(result).toMatchObject({ dropped: 1, restored: 0 });
    expect(hashes.size).toBe(0);
  });

  test("a flush with nothing dirty does nothing", async () => {
    const { redis } = fakeRedis();
    const apply = vi.fn();
    await expect(flushUsageCounters(redis, apply)).resolves.toEqual({
      orgs: 0,
      applied: 0,
      restored: 0,
      dropped: 0,
    });
    expect(apply).not.toHaveBeenCalled();
  });

  test("the database delta is one additive UPDATE on an existing row", async () => {
    await applyUsageDeltaToDb({ orgId: "org1", counts: { messagesCount: 7 } });
    expect(dbPool.query).toHaveBeenCalledWith(
      'UPDATE "UsageStats" SET "messagesCount" = "messagesCount" + $2 WHERE "orgId" = $1',
      ["org1", 7],
    );
  });
});
