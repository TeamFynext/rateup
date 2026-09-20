import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./cache.js", () => ({
  withCache: vi.fn((_key: string, _ttl: number, load: () => Promise<unknown>) => load()),
  cacheKeyFor: vi.fn(
    (ns: string, orgId: string, endpoint: string, params: Record<string, unknown>) =>
      `${ns}:${orgId}:${endpoint}:${JSON.stringify(params)}`,
  ),
}));

import { withCache } from "./cache.js";
import {
  analyticsTtlSeconds,
  cachedAnalytics,
  normalizeRangeForKey,
  parseDateRangeParam,
  wantsFresh,
} from "./analyticsCache.js";

type Mock = ReturnType<typeof vi.fn>;
const withCacheMock = withCache as unknown as Mock;

const NOW = new Date("2026-09-18T12:00:00.000Z");

/** The [key, ttl, load, options] the last cachedAnalytics call handed to the cache. */
function lastCall() {
  const [key, ttl, , options] = withCacheMock.mock.calls.at(-1)!;
  return { key: key as string, ttl: ttl as number, options: options as { bypass?: boolean } };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("analyticsTtlSeconds", () => {
  test.each([
    ["quick", 30],
    ["standard", 60],
    ["heavy", 120],
  ] as const)("holds a range that includes now for the %s TTL", (liveness, seconds) => {
    expect(analyticsTtlSeconds(NOW, liveness, NOW)).toBe(seconds);
  });

  test("treats a missing or unreadable end as a range that includes now", () => {
    expect(analyticsTtlSeconds(null, "standard", NOW)).toBe(60);
    expect(analyticsTtlSeconds(new Date("nope"), "standard", NOW)).toBe(60);
  });

  test("treats a range that ends in the future as one that includes now", () => {
    expect(analyticsTtlSeconds(new Date("2026-09-18T23:59:59.999Z"), "standard", NOW)).toBe(60);
  });

  test("holds a range that closed hours ago for ten minutes", () => {
    expect(analyticsTtlSeconds(new Date("2026-09-18T09:00:00Z"), "standard", NOW)).toBe(600);
  });

  test("does not yet trust a range that closed under two hours ago", () => {
    expect(analyticsTtlSeconds(new Date("2026-09-18T10:30:00Z"), "standard", NOW)).toBe(60);
  });

  test("holds a range that closed more than two days ago for six hours", () => {
    expect(analyticsTtlSeconds(new Date("2026-09-16T11:00:00Z"), "standard", NOW)).toBe(21600);
  });

  test("still expects receipts for a range that closed yesterday", () => {
    expect(analyticsTtlSeconds(new Date("2026-09-17T12:00:00Z"), "standard", NOW)).toBe(600);
  });
});

describe("parseDateRangeParam", () => {
  test("splits the two ends", () => {
    expect(parseDateRangeParam("2026-03-01,2026-03-07")).toEqual(["2026-03-01", "2026-03-07"]);
  });

  test.each([undefined, "", "2026-03-01", "a,b,c"])("gives nothing for %s", (value) => {
    expect(parseDateRangeParam(value)).toBeUndefined();
  });
});

describe("normalizeRangeForKey", () => {
  test("rounds the start down and the end up to the minute", () => {
    expect(normalizeRangeForKey(["2026-03-01T06:00:41.500Z", "2026-03-07T09:30:00.001Z"])).toEqual([
      "2026-03-01T06:00:00.000Z",
      "2026-03-07T09:31:00.000Z",
    ]);
  });

  test("leaves a range already on the minute alone", () => {
    expect(normalizeRangeForKey(["2026-03-01T06:00:00Z", "2026-03-07T09:30:00Z"])).toEqual([
      "2026-03-01T06:00:00.000Z",
      "2026-03-07T09:30:00.000Z",
    ]);
  });

  test("gives the same key to the same instant written two ways", () => {
    expect(
      normalizeRangeForKey(["2026-03-01T05:30:00+05:30", "2026-03-02T05:30:00+05:30"]),
    ).toEqual(normalizeRangeForKey(["2026-03-01T00:00:00Z", "2026-03-02T00:00:00Z"]));
  });

  test.each([[undefined], [[]], [["2026-03-01"]], [["nope", "2026-03-01"]]])(
    "gives nothing for %j",
    (range) => {
      expect(normalizeRangeForKey(range as string[] | undefined)).toBeNull();
    },
  );
});

describe("wantsFresh", () => {
  test.each(["1", "true", true])("is true for %s", (fresh) => {
    expect(wantsFresh({ fresh })).toBe(true);
  });

  test.each([undefined, null, {}, { fresh: "0" }, { fresh: "" }, { fresh: "no" }])(
    "is false for %j",
    (query) => {
      expect(wantsFresh(query)).toBe(false);
    },
  );
});

describe("cachedAnalytics", () => {
  const base = { orgId: "org-1", endpoint: "overview", liveness: "standard" } as const;
  const load = async () => "numbers";

  test("returns what the cache returns", async () => {
    await expect(cachedAnalytics(base, load)).resolves.toBe("numbers");
  });

  test("keys on the org, the endpoint, the parameters and the rounded range", async () => {
    await cachedAnalytics(
      {
        ...base,
        params: { teamId: "all" },
        dateRange: ["2026-03-01T00:00:10Z", "2026-03-07T00:00:00Z"],
      },
      load,
    );

    const { key } = lastCall();
    expect(key).toContain("analytics:v1:org-1:overview:");
    expect(key).toContain('"teamId":"all"');
    expect(key).toContain("2026-03-01T00:00:00.000Z");
    expect(key).not.toContain("00:00:10");
  });

  test("shares an entry between two rangeless requests in the same minute", async () => {
    await cachedAnalytics(base, load);
    const first = lastCall().key;
    vi.setSystemTime(new Date(NOW.getTime() + 40_000));
    await cachedAnalytics(base, load);

    expect(lastCall().key).toBe(first);
  });

  test("starts a new entry for a rangeless request the next minute", async () => {
    await cachedAnalytics(base, load);
    const first = lastCall().key;
    vi.setSystemTime(new Date(NOW.getTime() + 61_000));
    await cachedAnalytics(base, load);

    expect(lastCall().key).not.toBe(first);
  });

  test("keeps an unusable range apart from no range at all", async () => {
    await cachedAnalytics(base, load);
    const none = lastCall().key;
    await cachedAnalytics({ ...base, dateRange: ["2026-03-01"] }, load);

    expect(lastCall().key).not.toBe(none);
  });

  test("holds an old closed range for hours and an open one for a minute", async () => {
    await cachedAnalytics({ ...base, dateRange: ["2026-03-01", "2026-03-07T00:00:00Z"] }, load);
    expect(lastCall().ttl).toBe(21600);

    await cachedAnalytics(
      { ...base, dateRange: ["2026-09-11T00:00:00Z", NOW.toISOString()] },
      load,
    );
    expect(lastCall().ttl).toBe(60);
  });

  test("reads a date-only end as the whole of that day, which today has not finished", async () => {
    await cachedAnalytics({ ...base, dateRange: ["2026-09-11", "2026-09-18"] }, load);

    expect(lastCall().ttl).toBe(60);
  });

  test("bypasses the cache when the request asked for fresh numbers", async () => {
    await cachedAnalytics({ ...base, query: { fresh: "1" } }, load);
    expect(lastCall().options.bypass).toBe(true);

    await cachedAnalytics({ ...base, query: {} }, load);
    expect(lastCall().options.bypass).toBe(false);
  });

  test("keeps the fresh flag out of the key, so a refresh renews the entry others read", async () => {
    await cachedAnalytics({ ...base, query: { fresh: "1" } }, load);
    const fresh = lastCall().key;
    await cachedAnalytics({ ...base, query: {} }, load);

    expect(lastCall().key).toBe(fresh);
  });
});
