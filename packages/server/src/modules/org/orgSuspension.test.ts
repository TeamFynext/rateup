import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({ org: { findUnique: vi.fn() } }));
const redis = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }));
vi.mock("../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../utils/redisConnection.js", () => ({ default: redis }));
vi.mock("../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { isOrgSuspended, isSuspensionExemptRoute } from "./orgSuspension.js";

const ORG = "0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24";

beforeEach(() => {
  vi.clearAllMocks();
  redis.get.mockResolvedValue(null);
  redis.set.mockResolvedValue("OK");
});

describe("isOrgSuspended", () => {
  test("answers from the cache without touching the database", async () => {
    redis.get.mockResolvedValue("1");
    expect(await isOrgSuspended(ORG)).toBe(true);
    expect(db.org.findUnique).not.toHaveBeenCalled();
  });

  test("a cached 'not suspended' is an answer too, not a miss", async () => {
    redis.get.mockResolvedValue("0");
    expect(await isOrgSuspended(ORG)).toBe(false);
    expect(db.org.findUnique).not.toHaveBeenCalled();
  });

  test("on a miss it reads the org and caches the answer for a minute", async () => {
    db.org.findUnique.mockResolvedValue({ suspendedAt: new Date() });
    expect(await isOrgSuspended(ORG)).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(`org:suspended:${ORG}`, "1", "EX", 60);
  });

  test("Redis being down falls back to the org rather than letting everyone in", async () => {
    redis.get.mockRejectedValue(new Error("no redis"));
    redis.set.mockRejectedValue(new Error("no redis"));
    db.org.findUnique.mockResolvedValue({ suspendedAt: new Date() });
    expect(await isOrgSuspended(ORG)).toBe(true);
  });

  test("an org that was deleted mid-request is not treated as suspended", async () => {
    db.org.findUnique.mockResolvedValue(null);
    expect(await isOrgSuspended(ORG)).toBe(false);
  });
});

test("the routes that render the suspended screen stay open", () => {
  expect(isSuspensionExemptRoute("/api/user/info")).toBe(true);
  expect(isSuspensionExemptRoute("/api/org")).toBe(true);
  expect(isSuspensionExemptRoute("/api/campaign/send")).toBe(false);
  expect(isSuspensionExemptRoute(undefined)).toBe(false);
});
