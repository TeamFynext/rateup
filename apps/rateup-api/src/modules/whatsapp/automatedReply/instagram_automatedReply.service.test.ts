import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waAutomatedReply: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    waAutomatedReplyMessage: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    // deleteInstagramAutomatedReply runs its two deletes in one transaction; the mock
    // hands the callback the same client so the per-model assertions still apply.
    $transaction: vi.fn(),
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import {
  createInstagramAutomatedReply,
  createOrUpdateInstagramAutomationMessage,
  deleteInstagramAutomatedReply,
  findRecentInstagramAutomation,
  getInstagramAutomatedRepliesByOrgId,
  getInstagramAutomatedReplyById,
  logInstagramAutomationAction,
  updateInstagramAutomatedReply,
} from "./instagram_automatedReply.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  waAutomatedReply: {
    findMany: Mock;
    findFirst: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
  };
  waAutomatedReplyMessage: {
    findFirst: Mock;
    create: Mock;
    update: Mock;
    deleteMany: Mock;
  };
  $transaction: Mock;
};

const AUTOMATION = { id: "ig-auto-1", orgId: "org-1", name: "Comment reply" };
const TRACKING = { id: "msg-1", phone: "igs-1", currentNode: "node-1" };

beforeEach(() => {
  vi.clearAllMocks();
  db.waAutomatedReply.findMany.mockResolvedValue([AUTOMATION]);
  db.waAutomatedReply.findFirst.mockResolvedValue(AUTOMATION);
  db.waAutomatedReply.create.mockResolvedValue(AUTOMATION);
  db.waAutomatedReply.update.mockResolvedValue(AUTOMATION);
  db.waAutomatedReply.delete.mockResolvedValue(AUTOMATION);
  db.waAutomatedReplyMessage.findFirst.mockResolvedValue(null);
  db.waAutomatedReplyMessage.create.mockResolvedValue(TRACKING);
  db.waAutomatedReplyMessage.update.mockResolvedValue(TRACKING);
  db.waAutomatedReplyMessage.deleteMany.mockResolvedValue({ count: 0 });
  db.$transaction.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) => cb(db));
});

describe("getInstagramAutomatedRepliesByOrgId", () => {
  test("lists the org's Instagram automations, newest first", async () => {
    const result = await getInstagramAutomatedRepliesByOrgId("org-1");

    expect(db.waAutomatedReply.findMany.mock.calls[0][0]).toEqual({
      where: { orgId: "org-1", platform: PlatformType.INSTAGRAM },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual([AUTOMATION]);
  });

  // Both platforms share one table, so the platform filter is what keeps them apart.
  test("never returns a WhatsApp automation", async () => {
    await getInstagramAutomatedRepliesByOrgId("org-1");

    expect(db.waAutomatedReply.findMany.mock.calls[0][0].where.platform).toBe(
      PlatformType.INSTAGRAM,
    );
  });

  test("logs and rethrows when the listing fails", async () => {
    db.waAutomatedReply.findMany.mockRejectedValue(new Error("db down"));

    await expect(getInstagramAutomatedRepliesByOrgId("org-1")).rejects.toThrow("db down");
    expect(log.error).toHaveBeenCalled();
  });
});

describe("getInstagramAutomatedReplyById", () => {
  test("fetches the automation only if it is an Instagram one", async () => {
    await getInstagramAutomatedReplyById("ig-auto-1");

    expect(db.waAutomatedReply.findFirst).toHaveBeenCalledWith({
      where: { id: "ig-auto-1", platform: PlatformType.INSTAGRAM },
    });
  });

  test("returns null for an id that is not an Instagram automation", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(null);

    await expect(getInstagramAutomatedReplyById("wa-auto-1")).resolves.toBeNull();
  });

  test("logs and rethrows when the lookup fails", async () => {
    db.waAutomatedReply.findFirst.mockRejectedValue(new Error("db down"));

    await expect(getInstagramAutomatedReplyById("ig-auto-1")).rejects.toThrow("db down");
  });
});

describe("createInstagramAutomatedReply", () => {
  test("always stores the automation against the Instagram platform", async () => {
    await createInstagramAutomatedReply({
      orgId: "org-1",
      name: "Comment reply",
      matchData: { keywords: ["price"] },
      whatsappSettingsPhoneId: "phone-1",
    });

    expect(db.waAutomatedReply.create).toHaveBeenCalledWith({
      data: {
        orgId: "org-1",
        name: "Comment reply",
        matchData: { keywords: ["price"] },
        platform: PlatformType.INSTAGRAM,
        whatsappSettingsPhoneId: "phone-1",
      },
    });
  });

  // The enable toggle and the once-per-24h guard moved to Rule (Rule.isActive and
  // Rule.options.sendOncePerDay). Neither column exists on WaAutomatedReply any more,
  // so creation must not try to write them.
  test("writes no isEnabled or sendOnceIn24Hours column", async () => {
    await createInstagramAutomatedReply({ orgId: "org-1", name: "A", matchData: {} });

    const data = db.waAutomatedReply.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("sendOnceIn24Hours");
    expect(data).not.toHaveProperty("isEnabled");
  });

  test("logs and rethrows when creation fails", async () => {
    db.waAutomatedReply.create.mockRejectedValue(new Error("db down"));

    await expect(
      createInstagramAutomatedReply({ orgId: "org-1", name: "A", matchData: {} }),
    ).rejects.toThrow("db down");
    expect(log.error).toHaveBeenCalled();
  });
});

describe("updateInstagramAutomatedReply", () => {
  test("scopes the update to Instagram automations", async () => {
    await updateInstagramAutomatedReply("ig-auto-1", { name: "Renamed" });

    expect(db.waAutomatedReply.update.mock.calls[0][0].where).toEqual({
      id: "ig-auto-1",
      platform: PlatformType.INSTAGRAM,
    });
  });

  // Same as creation: both toggles live on Rule now, so the update must not touch them.
  test("writes no isEnabled or sendOnceIn24Hours column", async () => {
    await updateInstagramAutomatedReply("ig-auto-1", { name: "Renamed" });

    const data = db.waAutomatedReply.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("sendOnceIn24Hours");
    expect(data).not.toHaveProperty("isEnabled");
  });

  test("leaves unmentioned fields undefined so Prisma skips them", async () => {
    await updateInstagramAutomatedReply("ig-auto-1", { name: "Renamed" });

    const data = db.waAutomatedReply.update.mock.calls[0][0].data;
    expect(data.matchData).toBeUndefined();
    expect(data.whatsappSettingsPhoneId).toBeUndefined();
  });

  test("logs and rethrows when the update fails", async () => {
    db.waAutomatedReply.update.mockRejectedValue(new Error("db down"));

    await expect(updateInstagramAutomatedReply("ig-auto-1", {})).rejects.toThrow("db down");
  });
});

describe("deleteInstagramAutomatedReply", () => {
  test("removes the tracking rows before the automation itself", async () => {
    const order: string[] = [];
    db.waAutomatedReplyMessage.deleteMany.mockImplementation(async () => {
      order.push("messages");
      return { count: 2 };
    });
    db.waAutomatedReply.delete.mockImplementation(async () => {
      order.push("automation");
      return AUTOMATION;
    });

    await deleteInstagramAutomatedReply("ig-auto-1");

    expect(order).toEqual(["messages", "automation"]);
  });

  test("scopes the delete to Instagram automations", async () => {
    await deleteInstagramAutomatedReply("ig-auto-1");

    expect(db.waAutomatedReply.delete.mock.calls[0][0].where).toEqual({
      id: "ig-auto-1",
      platform: PlatformType.INSTAGRAM,
    });
  });

  test("reports success", async () => {
    await expect(deleteInstagramAutomatedReply("ig-auto-1")).resolves.toEqual({ success: true });
  });

  // Both deletes run in one transaction, as deleteRule does, so a failure on the second
  // takes the tracking-row delete down with it rather than leaving the automation alive
  // with its history gone.
  test("runs both deletes in a single transaction", async () => {
    await deleteInstagramAutomatedReply("ig-auto-1");

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  test("propagates a failure on the automation delete so the transaction rolls back", async () => {
    db.waAutomatedReply.delete.mockRejectedValue(new Error("fk violation"));

    await expect(deleteInstagramAutomatedReply("ig-auto-1")).rejects.toThrow("fk violation");
  });
});

describe("findRecentInstagramAutomation", () => {
  test("looks for a recent Instagram message to that user", async () => {
    await findRecentInstagramAutomation("igs-1", "org-1");

    const where = db.waAutomatedReplyMessage.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({
      phone: "igs-1",
      orgId: "org-1",
      waAutomatedReply: { platform: PlatformType.INSTAGRAM },
    });
    expect(where.createdAt.gte).toBeInstanceOf(Date);
  });

  test("defaults to looking back a day", async () => {
    const before = Date.now();

    await findRecentInstagramAutomation("igs-1", "org-1");

    const cutoff: Date = db.waAutomatedReplyMessage.findFirst.mock.calls[0][0].where.createdAt.gte;
    const hoursBack = (before - cutoff.getTime()) / (60 * 60 * 1000);
    expect(hoursBack).toBeGreaterThanOrEqual(24);
    expect(hoursBack).toBeLessThan(24.01);
  });

  test("honours a custom window", async () => {
    const before = Date.now();

    await findRecentInstagramAutomation("igs-1", "org-1", { timeWindow: 60 * 60 * 1000 });

    const cutoff: Date = db.waAutomatedReplyMessage.findFirst.mock.calls[0][0].where.createdAt.gte;
    const hoursBack = (before - cutoff.getTime()) / (60 * 60 * 1000);
    expect(hoursBack).toBeGreaterThanOrEqual(1);
    expect(hoursBack).toBeLessThan(1.01);
  });

  // Unlike the CRUD functions, this one swallows the failure so a lookup problem
  // cannot stop an incoming Instagram message being handled.
  test("reports nothing rather than throwing when the lookup fails", async () => {
    db.waAutomatedReplyMessage.findFirst.mockRejectedValue(new Error("db down"));

    await expect(findRecentInstagramAutomation("igs-1", "org-1")).resolves.toBeNull();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("logInstagramAutomationAction", () => {
  test("records the node and its response", async () => {
    const result = await logInstagramAutomationAction({
      igsId: "igs-1",
      nodeId: "node-1",
      automationId: "ig-auto-1",
      orgId: "org-1",
      response: { text: "hi" },
    });

    expect(result).toEqual({ nodeId: "node-1", response: { text: "hi" } });
    expect(log.info).toHaveBeenCalled();
  });
});

describe("createOrUpdateInstagramAutomationMessage", () => {
  const params = {
    igsId: "igs-1",
    automationId: "ig-auto-1",
    orgId: "org-1",
    currentNode: "node-2",
  };

  test("starts tracking a user who has not seen this automation before", async () => {
    await createOrUpdateInstagramAutomationMessage(params);

    expect(db.waAutomatedReplyMessage.create).toHaveBeenCalledWith({
      data: {
        phone: "igs-1",
        waAutomatedReplyId: "ig-auto-1",
        orgId: "org-1",
        currentNode: "node-2",
        status: "inProgress",
      },
    });
  });

  test("moves an existing tracking row to the new node", async () => {
    db.waAutomatedReplyMessage.findFirst.mockResolvedValue({ id: "msg-1" });

    await createOrUpdateInstagramAutomationMessage(params);

    expect(db.waAutomatedReplyMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { currentNode: "node-2", status: "inProgress" },
    });
    expect(db.waAutomatedReplyMessage.create).not.toHaveBeenCalled();
  });

  test("defaults an unstated status to in-progress", async () => {
    await createOrUpdateInstagramAutomationMessage(params);

    expect(db.waAutomatedReplyMessage.create.mock.calls[0][0].data.status).toBe("inProgress");
  });

  test("records a completed flow when told to", async () => {
    await createOrUpdateInstagramAutomationMessage({ ...params, status: "completed" });

    expect(db.waAutomatedReplyMessage.create.mock.calls[0][0].data.status).toBe("completed");
  });

  test("matches the tracking row on user, automation and org together", async () => {
    await createOrUpdateInstagramAutomationMessage(params);

    expect(db.waAutomatedReplyMessage.findFirst.mock.calls[0][0].where).toEqual({
      phone: "igs-1",
      waAutomatedReplyId: "ig-auto-1",
      orgId: "org-1",
    });
  });

  test("logs and rethrows when the write fails", async () => {
    db.waAutomatedReplyMessage.create.mockRejectedValue(new Error("db down"));

    await expect(createOrUpdateInstagramAutomationMessage(params)).rejects.toThrow("db down");
  });
});
