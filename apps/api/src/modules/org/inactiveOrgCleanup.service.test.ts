import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  org: { findMany: vi.fn(), updateMany: vi.fn() },
}));
const queue = vi.hoisted(() => ({ add: vi.fn() }));
const deleteOrg = vi.hoisted(() => vi.fn());
const resetThrottle = vi.hoisted(() => vi.fn());

vi.mock("../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../workers/bullmq/queues/notification.queue.js", () => ({ notificationQueue: queue }));
vi.mock("../../utils/email/OrgDeletionWarningEmail.js", () => ({
  createInactivityWarningTemplate: vi.fn(async () => "<html/>"),
}));
vi.mock("./org.services.js", () => ({ deleteOrg }));
vi.mock("./orgActivity.js", () => ({ resetOrgActivityThrottle: resetThrottle }));

import {
  deleteWarnedOrgs,
  runInactiveOrgCleanup,
  warnInactiveOrgs,
} from "./inactiveOrgCleanup.service.js";

const NOW = new Date("2026-11-07T06:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const org = { id: "org-1", name: "Acme", owner: { email: "o@acme.test", name: "Ola" } };

beforeEach(() => {
  vi.clearAllMocks();
  db.org.findMany.mockResolvedValue([org]);
  db.org.updateMany.mockResolvedValue({ count: 1 });
  queue.add.mockResolvedValue({});
  deleteOrg.mockResolvedValue({ orgName: "Acme", usersDeleted: ["u1"], usersKept: [] });
});

afterEach(() => {
  delete process.env.ROOT_ORG;
});

describe("warnInactiveOrgs", () => {
  test("schedules deletion 30 days out and emails the owner", async () => {
    await expect(warnInactiveOrgs(NOW)).resolves.toBe(1);

    const claim = db.org.updateMany.mock.calls[0][0];
    expect(claim.data).toEqual({
      deletionMailSent: NOW,
      scheduledDeletionAt: new Date(NOW.getTime() + 30 * DAY),
    });
    expect(claim.where).toMatchObject({ id: "org-1", scheduledDeletionAt: null });
    expect(resetThrottle).toHaveBeenCalledWith("org-1");
    expect(queue.add.mock.calls[0][1].emailData.to).toBe("o@acme.test");
  });

  test("looks for orgs idle for a year, skipping paying, suspended and root orgs", async () => {
    process.env.ROOT_ORG = "root-org";
    await warnInactiveOrgs(NOW);

    const where = db.org.findMany.mock.calls[0][0].where;
    const cutoff = new Date(NOW.getTime() - 365 * DAY);
    expect(where.scheduledDeletionAt).toBeNull();
    expect(where.AND[0].OR[0]).toEqual({ lastActiveAt: { lt: cutoff } });
    expect(where.AND[1]).toMatchObject({
      id: { not: "root-org" },
      suspendedAt: null,
      ApiAccessToken: { none: { lastUsedAt: { gt: cutoff } } },
    });
    expect(where.AND[1].NOT.Subscription.is.expiresAt).toEqual({ gt: NOW });
  });

  test("an org that signed in since the read is not emailed", async () => {
    db.org.updateMany.mockResolvedValue({ count: 0 });
    await expect(warnInactiveOrgs(NOW)).resolves.toBe(0);
    expect(queue.add).not.toHaveBeenCalled();
  });

  test("a failed email undoes the claim, so the org is never deleted unwarned", async () => {
    queue.add.mockRejectedValue(new Error("redis down"));
    await expect(warnInactiveOrgs(NOW)).resolves.toBe(0);

    expect(db.org.updateMany).toHaveBeenCalledTimes(2);
    expect(db.org.updateMany.mock.calls[1][0].data).toEqual({
      deletionMailSent: null,
      scheduledDeletionAt: null,
    });
  });
});

describe("deleteWarnedOrgs", () => {
  test("deletes only orgs that were warned and whose deadline passed", async () => {
    await expect(deleteWarnedOrgs(NOW)).resolves.toBe(1);

    const where = db.org.findMany.mock.calls[0][0].where;
    expect(where.scheduledDeletionAt).toEqual({ lte: NOW });
    expect(where.deletionMailSent).toEqual({ not: null });
    expect(deleteOrg).toHaveBeenCalledWith("org-1");
  });

  test("one failed delete does not stop the rest", async () => {
    db.org.findMany.mockResolvedValue([org, { ...org, id: "org-2" }]);
    deleteOrg.mockRejectedValueOnce(new Error("FK"));
    await expect(deleteWarnedOrgs(NOW)).resolves.toBe(1);
    expect(deleteOrg).toHaveBeenCalledTimes(2);
  });
});

describe("runInactiveOrgCleanup", () => {
  test("warns and deletes on every run", async () => {
    await runInactiveOrgCleanup(NOW);
    expect(queue.add).toHaveBeenCalled();
    expect(deleteOrg).toHaveBeenCalledWith("org-1");
  });
});
