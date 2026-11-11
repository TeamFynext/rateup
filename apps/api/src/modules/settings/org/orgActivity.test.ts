import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({ org: { update: vi.fn() } }));
const redis = vi.hoisted(() => ({ set: vi.fn(), del: vi.fn() }));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: redis }));
vi.mock("../../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { touchOrgActivity } from "./orgActivity.js";

beforeEach(() => {
  vi.clearAllMocks();
  db.org.update.mockResolvedValue({ id: "org-1" });
});

describe("touchOrgActivity", () => {
  test("stamps activity and cancels a pending deletion", async () => {
    redis.set.mockResolvedValue("OK");
    await touchOrgActivity("org-1");

    expect(redis.set).toHaveBeenCalledWith("orgActive:org-1", "1", "EX", 3600, "NX");
    const { where, data } = db.org.update.mock.calls[0][0];
    expect(where).toEqual({ id: "org-1" });
    expect(data).toMatchObject({ deletionMailSent: null, scheduledDeletionAt: null });
    expect(data.lastActiveAt).toBeInstanceOf(Date);
  });

  test("writes at most once an hour", async () => {
    redis.set.mockResolvedValue(null);
    await touchOrgActivity("org-1");
    expect(db.org.update).not.toHaveBeenCalled();
  });

  test("never throws", async () => {
    redis.set.mockRejectedValue(new Error("redis down"));
    await expect(touchOrgActivity("org-1")).resolves.toBeUndefined();
  });
});
