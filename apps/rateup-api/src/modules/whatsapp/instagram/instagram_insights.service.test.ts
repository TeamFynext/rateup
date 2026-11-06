import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../metaChannel/metaChannel.service.js", () => ({ getInstagramChannel: vi.fn() }));
vi.mock("./instagram_messaging.service.js", () => ({ getInstagramMediaPosts: vi.fn() }));
vi.mock("../wa_axios.js", async () => {
  class GraphApiError extends Error {
    error: { code: number; message: string };
    constructor(code: number) {
      super("graph");
      this.error = { code, message: "graph" };
    }
  }
  return { callMetaApi: vi.fn(), GraphApiError };
});
vi.mock("../../../utils/cache.js", () => ({
  cacheKeyFor: (...parts: unknown[]) => JSON.stringify(parts),
  withCache: (_key: string, _ttl: number, load: () => Promise<unknown>) => load(),
}));
vi.mock("../../../utils/prisma.js", () => ({ default: { $queryRaw: vi.fn() } }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { getInstagramChannel } from "../metaChannel/metaChannel.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import {
  chunkWindow,
  getAccountInsights,
  getMediaInsights,
  getPostAttribution,
  insightNumber,
  isPermissionError,
  metricsForProductType,
  rangeWindow,
} from "./instagram_insights.service.js";

const ORG = "org-1";
const IBA = "iba-1";
const graphError = (code: number) =>
  new (GraphApiError as unknown as new (code: number) => Error)(code);
const callMeta = vi.mocked(callMetaApi);
const ok = (data: unknown) => ({ data }) as Awaited<ReturnType<typeof callMetaApi>>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getInstagramChannel).mockResolvedValue({
    orgId: ORG,
    pageAccessToken: "tok",
  } as Awaited<ReturnType<typeof getInstagramChannel>>);
});

describe("windows", () => {
  test("90 days splits into three 30-day calls", () => {
    const now = new Date("2026-11-04T00:00:00Z");
    const chunks = chunkWindow(rangeWindow("90d", now));
    expect(chunks).toHaveLength(3);
    expect(chunks[0].since.toISOString()).toBe("2026-08-06T00:00:00.000Z");
    expect(chunks[2].until.toISOString()).toBe(now.toISOString());
  });

  test("7 days is one call", () => {
    expect(chunkWindow(rangeWindow("7d"))).toHaveLength(1);
  });
});

describe("helpers", () => {
  test("reads total_value and the older values shape", () => {
    expect(insightNumber({ name: "views", total_value: { value: 12 } })).toBe(12);
    expect(insightNumber({ name: "reach", values: [{ value: 5 }] })).toBe(5);
    expect(insightNumber(undefined)).toBeNull();
  });

  test("stories get link_clicks and no saved; feed the reverse", () => {
    expect(metricsForProductType("STORY")).toContain("link_clicks");
    expect(metricsForProductType("STORY")).not.toContain("saved");
    expect(metricsForProductType("REELS")).toContain("saved");
  });

  test("permission codes", () => {
    expect(isPermissionError(graphError(10))).toBe(true);
    expect(isPermissionError(graphError(190))).toBe(true);
    expect(isPermissionError(graphError(100))).toBe(false);
    expect(isPermissionError(new Error("x"))).toBe(false);
  });
});

describe("getAccountInsights", () => {
  test("sums totals, builds the daily series and follower count", async () => {
    callMeta.mockImplementation(async (url: string) => {
      if (url.includes("follows_and_unfollows")) {
        return ok({
          data: [
            {
              name: "follows_and_unfollows",
              total_value: {
                breakdowns: [
                  {
                    results: [
                      { dimension_values: ["FOLLOWER"], value: 2 },
                      { dimension_values: ["NON_FOLLOWER"], value: 1 },
                    ],
                  },
                ],
              },
            },
          ],
        });
      }
      if (url.includes("metric_type=total_value")) {
        return ok({
          data: [
            { name: "views", total_value: { value: 100 } },
            { name: "reach", total_value: { value: 40 } },
            { name: "total_interactions", total_value: { value: 9 } },
            { name: "accounts_engaged", total_value: { value: 7 } },
          ],
        });
      }
      if (url.includes("metric_type=time_series")) {
        return ok({
          data: [{ name: "reach", values: [{ value: 3, end_time: "2026-11-02T07:00:00+0000" }] }],
        });
      }
      return ok({ followers_count: 1500 });
    });

    const result = await getAccountInsights(IBA, ORG, "7d");
    expect(result.totals).toEqual({
      views: 100,
      reach: 40,
      totalInteractions: 9,
      accountsEngaged: 7,
    });
    expect(result.followers).toEqual({ count: 1500, gained: 2, lost: 1 });
    expect(result.daily).toEqual([{ date: "2026-11-01", reach: 3 }]);
    expect(result.unavailable).toEqual([]);
  });

  test("retries metric by metric when Graph refuses the set", async () => {
    callMeta.mockImplementation(async (url: string) => {
      if (url.includes("metric_type=total_value")) {
        if (url.includes("metric=views,")) throw graphError(100);
        if (url.includes("metric=accounts_engaged")) throw graphError(100);
        return ok({ data: [{ name: url.match(/metric=(\w+)/)![1], total_value: { value: 1 } }] });
      }
      return ok({ data: [] });
    });
    const result = await getAccountInsights(IBA, ORG, "7d");
    expect(result.totals.views).toBe(1);
    expect(result.totals.accountsEngaged).toBeNull();
    expect(result.unavailable).toContain("accounts_engaged");
  });

  test("a missing permission is rethrown, not swallowed", async () => {
    callMeta.mockRejectedValue(graphError(10));
    await expect(getAccountInsights(IBA, ORG, "30d")).rejects.toSatisfy(isPermissionError);
  });

  test("another org's account is not found", async () => {
    vi.mocked(getInstagramChannel).mockResolvedValue(null);
    await expect(getAccountInsights(IBA, ORG, "30d")).rejects.toThrow("not connected");
  });
});

describe("getMediaInsights", () => {
  test("asks for the story metric set and marks a refused media", async () => {
    callMeta.mockImplementation(async (url: string) => {
      if (url.startsWith("/m1?")) return ok({ media_product_type: "STORY", like_count: 0 });
      if (url.startsWith("/m1/insights")) {
        expect(url).toContain("link_clicks");
        return ok({ data: [{ name: "link_clicks", values: [{ value: 4 }] }] });
      }
      throw graphError(100);
    });
    const [story, gone] = await getMediaInsights(IBA, ORG, ["m1", "m2"]);
    expect(story.linkClicks).toBe(4);
    expect(story.productType).toBe("STORY");
    expect(gone.error).toBe("unavailable");
  });
});

describe("getPostAttribution", () => {
  test("merges order rows per media and fills zeros", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([
        { mediaId: "m1", comments: 5, commentsAnswered: 3, dmsStarted: 2, leads: 1 },
      ] as never)
      .mockResolvedValueOnce([
        { mediaId: "m1", currency: "INR", orders: 2, amount: "150.50" },
        { mediaId: "m1", currency: "USD", orders: 1, amount: "10" },
      ] as never);
    const [row] = await getPostAttribution(IBA, ORG, ["m1"], rangeWindow("30d"));
    expect(row).toEqual({
      mediaId: "m1",
      comments: 5,
      commentsAnswered: 3,
      dmsStarted: 2,
      leads: 1,
      orders: 3,
      revenue: [
        { currency: "INR", amount: 150.5 },
        { currency: "USD", amount: 10 },
      ],
    });
  });

  test("no media, no query", async () => {
    expect(await getPostAttribution(IBA, ORG, [], rangeWindow("7d"))).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
