import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const redis = vi.hoisted(() => ({
  status: "ready" as string,
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("./redisConnection.js", () => ({ default: redis }));
vi.mock("./logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { cacheKeyFor, withCache } from "./cache.js";
import { log } from "./logger.js";

const KEY = "analytics:v1:org-1:overview:abc";

beforeEach(() => {
  vi.clearAllMocks();
  redis.status = "ready";
  redis.get.mockResolvedValue(null);
  redis.set.mockResolvedValue("OK");
  delete process.env.ANALYTICS_CACHE_DISABLED;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withCache - a miss", () => {
  test("loads from the source and returns what it loaded", async () => {
    const load = vi.fn().mockResolvedValue({ total: 3 });

    await expect(withCache(KEY, 60, load)).resolves.toEqual({ total: 3 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  test("stores the result for the TTL it was given", async () => {
    await withCache(KEY, 60, async () => ({ total: 3 }));

    expect(redis.set).toHaveBeenCalledWith(KEY, JSON.stringify({ total: 3 }), "EX", 60);
  });

  test("returns the loaded value itself, not a copy that went through JSON", async () => {
    const value = { at: new Date("2026-03-01T00:00:00Z") };

    const result = await withCache(KEY, 60, async () => value);

    expect(result).toBe(value);
  });
});

describe("withCache - a hit", () => {
  test("returns the stored value without loading", async () => {
    redis.get.mockResolvedValue(JSON.stringify({ total: 9 }));
    const load = vi.fn();

    await expect(withCache(KEY, 60, load)).resolves.toEqual({ total: 9 });
    expect(load).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("serves a stored falsy value rather than mistaking it for a miss", async () => {
    redis.get.mockResolvedValue("0");
    const load = vi.fn();

    await expect(withCache(KEY, 60, load)).resolves.toBe(0);
    expect(load).not.toHaveBeenCalled();
  });
});

describe("withCache - bypass", () => {
  test("skips the read, loads, and refreshes the entry", async () => {
    redis.get.mockResolvedValue(JSON.stringify({ total: 9 }));
    const load = vi.fn().mockResolvedValue({ total: 10 });

    await expect(withCache(KEY, 60, load, { bypass: true })).resolves.toEqual({ total: 10 });
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith(KEY, JSON.stringify({ total: 10 }), "EX", 60);
  });
});

describe("withCache - failing open", () => {
  test("loads from the source when the read throws", async () => {
    redis.get.mockRejectedValue(new Error("redis down"));

    await expect(withCache(KEY, 60, async () => "fresh")).resolves.toBe("fresh");
    expect(log.warn).toHaveBeenCalled();
  });

  test("loads from the source when the stored value is not JSON", async () => {
    redis.get.mockResolvedValue("{not json");

    await expect(withCache(KEY, 60, async () => "fresh")).resolves.toBe("fresh");
  });

  test("does not touch Redis while the connection is not ready", async () => {
    // Commands issued now would be queued and never settle: the shared connection
    // retries forever. Reading the status first is what keeps an outage from
    // hanging the endpoint.
    redis.status = "reconnecting";

    await expect(withCache(KEY, 60, async () => "fresh")).resolves.toBe("fresh");
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("gives up on a read that never answers", async () => {
    vi.useFakeTimers();
    redis.get.mockReturnValue(new Promise(() => {}));

    const result = withCache(KEY, 60, async () => "fresh");
    await vi.advanceTimersByTimeAsync(300);

    await expect(result).resolves.toBe("fresh");
  });

  test("still answers when the write fails", async () => {
    redis.set.mockRejectedValue(new Error("redis down"));

    await expect(withCache(KEY, 60, async () => "fresh")).resolves.toBe("fresh");
  });

  test("still answers when the value cannot be stored", async () => {
    const value = { big: 10n };

    await expect(withCache(KEY, 60, async () => value)).resolves.toBe(value);
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("lets the source's own failure through, and caches nothing", async () => {
    await expect(
      withCache(KEY, 60, async () => {
        throw new Error("db down");
      }),
    ).rejects.toThrow("db down");
    expect(redis.set).not.toHaveBeenCalled();
  });
});

describe("withCache - switched off", () => {
  test("goes straight to the source when ANALYTICS_CACHE_DISABLED is true", async () => {
    process.env.ANALYTICS_CACHE_DISABLED = "true";
    redis.get.mockResolvedValue(JSON.stringify("stale"));

    await expect(withCache(KEY, 60, async () => "fresh")).resolves.toBe("fresh");
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("goes straight to the source for a TTL of zero", async () => {
    await expect(withCache(KEY, 0, async () => "fresh")).resolves.toBe("fresh");
    expect(redis.get).not.toHaveBeenCalled();
  });
});

describe("withCache - identical requests at the same moment", () => {
  test("share one load", async () => {
    let release!: (value: string) => void;
    const load = vi.fn(() => new Promise<string>((resolve) => (release = resolve)));

    const first = withCache(KEY, 60, load);
    const second = withCache(KEY, 60, load);
    // Let both get past their cache read before the load settles.
    await vi.waitFor(() => expect(load).toHaveBeenCalled());
    await Promise.resolve();
    release("loaded");

    await expect(Promise.all([first, second])).resolves.toEqual(["loaded", "loaded"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  test("do not share across keys", async () => {
    const load = vi.fn().mockResolvedValue("loaded");

    await Promise.all([withCache(`${KEY}:a`, 60, load), withCache(`${KEY}:b`, 60, load)]);

    expect(load).toHaveBeenCalledTimes(2);
  });

  test("load again once the first has finished", async () => {
    const load = vi.fn().mockResolvedValue("loaded");

    await withCache(KEY, 60, load);
    await withCache(KEY, 60, load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  test("are not poisoned by a load that failed", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValue("loaded");

    await expect(withCache(KEY, 60, load)).rejects.toThrow("db down");
    await expect(withCache(KEY, 60, load)).resolves.toBe("loaded");
  });
});

describe("cacheKeyFor", () => {
  test("puts the org in the clear, ahead of the endpoint", () => {
    expect(cacheKeyFor("analytics:v1", "org-1", "overview", {})).toMatch(
      /^analytics:v1:org-1:overview:[0-9a-f]{40}$/,
    );
  });

  test("is the same whatever order the parameters were written in", () => {
    expect(cacheKeyFor("ns", "org-1", "e", { a: 1, b: 2 })).toBe(
      cacheKeyFor("ns", "org-1", "e", { b: 2, a: 1 }),
    );
  });

  test("ignores a parameter that is undefined", () => {
    expect(cacheKeyFor("ns", "org-1", "e", { a: 1, b: undefined })).toBe(
      cacheKeyFor("ns", "org-1", "e", { a: 1 }),
    );
  });

  test.each([
    ["a different value", { a: 2 }],
    ["a different parameter", { b: 1 }],
    ["a null where there was nothing", { a: 1, b: null }],
  ])("changes for %s", (_name, params) => {
    expect(cacheKeyFor("ns", "org-1", "e", params)).not.toBe(
      cacheKeyFor("ns", "org-1", "e", { a: 1 }),
    );
  });

  test("never gives two orgs the same key", () => {
    expect(cacheKeyFor("ns", "org-1", "e", { a: 1 })).not.toBe(
      cacheKeyFor("ns", "org-2", "e", { a: 1 }),
    );
  });
});
