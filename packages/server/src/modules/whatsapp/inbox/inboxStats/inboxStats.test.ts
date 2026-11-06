import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    inboxStats: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    $queryRaw: vi.fn(),
  },
  excludeFields: vi.fn(),
}));

import prisma from "../../../../utils/prisma.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import {
  decrementInboxStat,
  getInboxCountsFromConversations,
  getOrCreateInboxStats,
  incrementInboxStat,
  mapStatusToField,
  transitionInboxStat,
} from "./inboxStats.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  inboxStats: { findUnique: Mock; create: Mock; upsert: Mock };
  $queryRaw: Mock;
};

const ZERO_STATS = {
  orgId: "org-1",
  unassignedCount: 0,
  assignedCount: 0,
  closedCount: 0,
  spamCount: 0,
  resolvedCount: 0,
  unresolvedCount: 0,
  blockedCount: 0,
  totalCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  db.inboxStats.findUnique.mockResolvedValue(ZERO_STATS);
  db.inboxStats.create.mockResolvedValue(ZERO_STATS);
  db.inboxStats.upsert.mockResolvedValue(ZERO_STATS);
  db.$queryRaw.mockResolvedValue([{ all_count: 7, open_count: 3, closed_count: 4 }]);
});

describe("mapStatusToField", () => {
  test.each([
    [WaMessageAssignStatus.UNASSIGNED, "unassignedCount"],
    [WaMessageAssignStatus.ASSIGNED, "assignedCount"],
    [WaMessageAssignStatus.CLOSED, "closedCount"],
    [WaMessageAssignStatus.SPAM, "spamCount"],
    [WaMessageAssignStatus.RESOLVED, "resolvedCount"],
    [WaMessageAssignStatus.UNRESOLVED, "unresolvedCount"],
  ])("maps %s to its counter", (status, field) => {
    expect(mapStatusToField(status)).toBe(field);
  });

  test("returns null for a status with no counter of its own", () => {
    expect(mapStatusToField("NEW")).toBeNull();
  });

  // blockedCount and totalCount exist as fields but no status maps onto them.
  test("returns null rather than guessing at blocked or total", () => {
    expect(mapStatusToField("BLOCKED")).toBeNull();
    expect(mapStatusToField("")).toBeNull();
  });
});

describe("getOrCreateInboxStats", () => {
  test("returns the org's existing row without writing", async () => {
    const existing = { ...ZERO_STATS, assignedCount: 5 };
    db.inboxStats.findUnique.mockResolvedValue(existing);

    const result = await getOrCreateInboxStats("org-1");

    expect(result).toBe(existing);
    expect(db.inboxStats.create).not.toHaveBeenCalled();
  });

  test("creates a zeroed row the first time an org is seen", async () => {
    db.inboxStats.findUnique.mockResolvedValue(null);

    await getOrCreateInboxStats("org-1");

    expect(db.inboxStats.create).toHaveBeenCalledWith({ data: ZERO_STATS });
  });
});

describe("getInboxCountsFromConversations", () => {
  test("derives the counts straight from the conversations", async () => {
    const result = await getInboxCountsFromConversations("org-1");

    expect(db.$queryRaw).toHaveBeenCalled();
    expect(result).toEqual({ all_count: 7, open_count: 3, closed_count: 4 });
  });

  test("reports zeroes when the org has no conversations", async () => {
    db.$queryRaw.mockResolvedValue([]);

    await expect(getInboxCountsFromConversations("org-1")).resolves.toEqual({
      all_count: 0,
      open_count: 0,
      closed_count: 0,
    });
  });

  test("reports zeroes when the query yields nothing at all", async () => {
    db.$queryRaw.mockResolvedValue(null);

    await expect(getInboxCountsFromConversations("org-1")).resolves.toEqual({
      all_count: 0,
      open_count: 0,
      closed_count: 0,
    });
  });

  test("counts open and closed tickets separately from the total", async () => {
    db.$queryRaw.mockResolvedValue([{ all_count: 10, open_count: 6, closed_count: 4 }]);

    const result = await getInboxCountsFromConversations("org-1");

    expect(result.open_count + result.closed_count).toBe(result.all_count);
  });
});

describe("incrementInboxStat", () => {
  test("bumps the counter, creating the row if the org has none", async () => {
    await incrementInboxStat("org-1", "assignedCount");

    expect(db.inboxStats.upsert).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      update: { assignedCount: { increment: 1 } },
      create: { orgId: "org-1", assignedCount: 1 },
    });
  });

  test("bumps by the requested amount", async () => {
    await incrementInboxStat("org-1", "closedCount", 5);

    expect(db.inboxStats.upsert.mock.calls[0][0].update).toEqual({
      closedCount: { increment: 5 },
    });
  });

  test.each([
    ["a zero amount", 0],
    ["a negative amount", -3],
  ])("writes nothing for %s", async (_name, amount) => {
    await incrementInboxStat("org-1", "assignedCount", amount);

    expect(db.inboxStats.upsert).not.toHaveBeenCalled();
  });

  test("writes nothing when no field is named", async () => {
    await incrementInboxStat("org-1", null as any);

    expect(db.inboxStats.upsert).not.toHaveBeenCalled();
  });
});

describe("decrementInboxStat", () => {
  test("lowers the counter, seeding a zeroed row if the org has none", async () => {
    await decrementInboxStat("org-1", "assignedCount");

    expect(db.inboxStats.upsert).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      update: { assignedCount: { decrement: 1 } },
      create: { orgId: "org-1", assignedCount: 0 },
    });
  });

  test("lowers by the requested amount", async () => {
    await decrementInboxStat("org-1", "spamCount", 2);

    expect(db.inboxStats.upsert.mock.calls[0][0].update).toEqual({ spamCount: { decrement: 2 } });
  });

  test("writes nothing for a non-positive amount", async () => {
    await decrementInboxStat("org-1", "assignedCount", 0);

    expect(db.inboxStats.upsert).not.toHaveBeenCalled();
  });
});

describe("transitionInboxStat", () => {
  test("moves the count from one status to another in a single write", async () => {
    await transitionInboxStat("org-1", "unassignedCount", "assignedCount");

    expect(db.inboxStats.upsert).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      update: {
        unassignedCount: { decrement: 1 },
        assignedCount: { increment: 1 },
      },
      create: { orgId: "org-1", assignedCount: 1 },
    });
  });

  test("only increments when the ticket came from no counted status", async () => {
    await transitionInboxStat("org-1", null, "assignedCount");

    expect(db.inboxStats.upsert.mock.calls[0][0].update).toEqual({
      assignedCount: { increment: 1 },
    });
  });

  test("only decrements when the ticket moves to no counted status", async () => {
    await transitionInboxStat("org-1", "assignedCount", null);

    expect(db.inboxStats.upsert.mock.calls[0][0].update).toEqual({
      assignedCount: { decrement: 1 },
    });
  });

  test("seeds an empty row when the destination is not counted", async () => {
    await transitionInboxStat("org-1", "assignedCount", null);

    expect(db.inboxStats.upsert.mock.calls[0][0].create).toEqual({ orgId: "org-1" });
  });

  test("writes nothing when the status did not actually change", async () => {
    await transitionInboxStat("org-1", "assignedCount", "assignedCount");

    expect(db.inboxStats.upsert).not.toHaveBeenCalled();
  });

  test("writes nothing when neither side is a counted status", async () => {
    await transitionInboxStat("org-1", null, null);

    expect(db.inboxStats.upsert).not.toHaveBeenCalled();
  });

  test("writes nothing for a non-positive amount", async () => {
    await transitionInboxStat("org-1", "unassignedCount", "assignedCount", 0);

    expect(db.inboxStats.upsert).not.toHaveBeenCalled();
  });

  test("moves the requested amount", async () => {
    await transitionInboxStat("org-1", "unassignedCount", "assignedCount", 4);

    expect(db.inboxStats.upsert.mock.calls[0][0]).toMatchObject({
      update: {
        unassignedCount: { decrement: 4 },
        assignedCount: { increment: 4 },
      },
      create: { orgId: "org-1", assignedCount: 4 },
    });
  });
});
