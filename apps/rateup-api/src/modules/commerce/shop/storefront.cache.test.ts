import { beforeEach, describe, expect, test, vi } from "vitest";

const cache = vi.hoisted(() => ({ withCache: vi.fn() }));
const redis = vi.hoisted(() => ({ status: "ready", del: vi.fn() }));

vi.mock("../../../utils/cache.js", () => cache);
vi.mock("../../../utils/redisConnection.js", () => ({ default: redis }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));
vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("./store.service.js", () => ({ commerceEnabled: vi.fn() }));

const { forgetPublicStorefront, getPublicStorefront } = await import("./storefront.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  redis.status = "ready";
  redis.del.mockResolvedValue(1);
});

describe("the public storefront cache", () => {
  test("is read through a short-lived per-slug entry", async () => {
    cache.withCache.mockResolvedValue({ store: { slug: "fern" } });

    await getPublicStorefront("fern");

    expect(cache.withCache).toHaveBeenCalledWith(
      "storefront:public:fern",
      30,
      expect.any(Function),
    );
  });

  test("a store edit clears the old and new address once each", () => {
    forgetPublicStorefront("fern", "fern-field", "fern");

    expect(redis.del).toHaveBeenCalledWith(
      "storefront:public:fern",
      "storefront:public:fern-field",
    );
  });

  test("clearing never waits on Redis that isn't connected", () => {
    redis.status = "reconnecting";

    forgetPublicStorefront("fern");

    expect(redis.del).not.toHaveBeenCalled();
  });
});
