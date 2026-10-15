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
    // deleteMetaAutomation runs its two deletes in one transaction; the mock
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
import { Prisma } from "../../../../generated/prisma/client.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import {
  cloneMetaAutomation,
  createMetaAutomation,
  createOrUpdateMetaFlowRun,
  deleteMetaAutomation,
  findRecentInstagramAutomation,
  getMetaAutomationsByOrgId,
  getMetaAutomationById,
  logMetaFlowAction,
  updateMetaAutomation,
  wasInstagramAutomationSentRecently,
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

const IG = PlatformType.INSTAGRAM;
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

describe("getMetaAutomationsByOrgId", () => {
  test("lists the org's Instagram automations, newest first", async () => {
    const result = await getMetaAutomationsByOrgId("org-1", IG);

    expect(db.waAutomatedReply.findMany.mock.calls[0][0]).toEqual({
      where: { orgId: "org-1", platform: PlatformType.INSTAGRAM },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual([AUTOMATION]);
  });

  // Both platforms share one table, so the platform filter is what keeps them apart.
  test("never returns a WhatsApp automation", async () => {
    await getMetaAutomationsByOrgId("org-1", IG);

    expect(db.waAutomatedReply.findMany.mock.calls[0][0].where.platform).toBe(
      PlatformType.INSTAGRAM,
    );
  });

  test("logs and rethrows when the listing fails", async () => {
    db.waAutomatedReply.findMany.mockRejectedValue(new Error("db down"));

    await expect(getMetaAutomationsByOrgId("org-1", IG)).rejects.toThrow("db down");
    expect(log.error).toHaveBeenCalled();
  });
});

describe("getMetaAutomationById", () => {
  test("fetches the automation only if it is the org's and on the platform", async () => {
    await getMetaAutomationById("ig-auto-1", "org-1", IG);

    expect(db.waAutomatedReply.findFirst).toHaveBeenCalledWith({
      where: { id: "ig-auto-1", orgId: "org-1", platform: PlatformType.INSTAGRAM },
    });
  });

  test("returns null for an id that is not an Instagram automation", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(null);

    await expect(getMetaAutomationById("wa-auto-1", "org-1", IG)).resolves.toBeNull();
  });

  test("logs and rethrows when the lookup fails", async () => {
    db.waAutomatedReply.findFirst.mockRejectedValue(new Error("db down"));

    await expect(getMetaAutomationById("ig-auto-1", "org-1", IG)).rejects.toThrow("db down");
  });
});

describe("createMetaAutomation", () => {
  test("stores the automation against the platform it was created for", async () => {
    await createMetaAutomation(IG, {
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

  // sendOnceIn24Hours and isEnabled are gone from WaAutomatedReply — the once-a-day
  // throttle and the on/off switch both live on rules now. Nothing writes them, so a
  // caller that still sends them cannot resurrect the columns by accident.
  test("writes no throttle or enabled column on creation", async () => {
    await createMetaAutomation(IG, { orgId: "org-1", name: "A", matchData: {} });

    const data = db.waAutomatedReply.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("sendOnceIn24Hours");
    expect(data).not.toHaveProperty("isEnabled");
  });

  test("logs and rethrows when creation fails", async () => {
    db.waAutomatedReply.create.mockRejectedValue(new Error("db down"));

    await expect(
      createMetaAutomation(IG, { orgId: "org-1", name: "A", matchData: {} }),
    ).rejects.toThrow("db down");
    expect(log.error).toHaveBeenCalled();
  });
});

describe("updateMetaAutomation", () => {
  test("scopes the update to the org and platform", async () => {
    await updateMetaAutomation("ig-auto-1", "org-1", IG, { name: "Renamed" });

    expect(db.waAutomatedReply.update.mock.calls[0][0].where).toEqual({
      id: "ig-auto-1",
      orgId: "org-1",
      platform: PlatformType.INSTAGRAM,
    });
  });

  // Same as creation: the two columns are gone, so an update never mentions them.
  test("writes no throttle or enabled column on update", async () => {
    await updateMetaAutomation("ig-auto-1", "org-1", IG, { name: "Renamed" });

    const data = db.waAutomatedReply.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("sendOnceIn24Hours");
    expect(data).not.toHaveProperty("isEnabled");
  });

  test("leaves unmentioned fields undefined so Prisma skips them", async () => {
    await updateMetaAutomation("ig-auto-1", "org-1", IG, { name: "Renamed" });

    expect(db.waAutomatedReply.update.mock.calls[0][0].data.matchData).toBeUndefined();
  });

  test("logs and rethrows when the update fails", async () => {
    db.waAutomatedReply.update.mockRejectedValue(new Error("db down"));

    await expect(updateMetaAutomation("ig-auto-1", "org-1", IG, {})).rejects.toThrow("db down");
  });
});

describe("deleteMetaAutomation", () => {
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

    await deleteMetaAutomation("ig-auto-1", "org-1", IG);

    expect(order).toEqual(["messages", "automation"]);
  });

  test("scopes the delete to the org and platform", async () => {
    await deleteMetaAutomation("ig-auto-1", "org-1", IG);

    expect(db.waAutomatedReply.delete.mock.calls[0][0].where).toEqual({
      id: "ig-auto-1",
      orgId: "org-1",
      platform: PlatformType.INSTAGRAM,
    });
  });

  test("reports success", async () => {
    await expect(deleteMetaAutomation("ig-auto-1", "org-1", IG)).resolves.toEqual({
      success: true,
    });
  });

  // Both deletes run in one transaction, as deleteRule does, so a failure on the second
  // takes the tracking-row delete down with it rather than leaving the automation alive
  // with its history gone.
  test("runs both deletes in a single transaction", async () => {
    await deleteMetaAutomation("ig-auto-1", "org-1", IG);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  test("propagates a failure on the automation delete so the transaction rolls back", async () => {
    db.waAutomatedReply.delete.mockRejectedValue(new Error("fk violation"));

    await expect(deleteMetaAutomation("ig-auto-1", "org-1", IG)).rejects.toThrow("fk violation");
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

describe("logMetaFlowAction", () => {
  test("records the node and its response", async () => {
    const result = await logMetaFlowAction({
      recipientId: "igs-1",
      nodeId: "node-1",
      automationId: "ig-auto-1",
      orgId: "org-1",
      response: { text: "hi" },
    });

    expect(result).toEqual({ nodeId: "node-1", response: { text: "hi" } });
    expect(log.info).toHaveBeenCalled();
  });
});

describe("createOrUpdateMetaFlowRun", () => {
  const params = {
    recipientId: "igs-1",
    automationId: "ig-auto-1",
    orgId: "org-1",
    currentNode: "node-2",
  };

  test("starts tracking a user who has not seen this automation before", async () => {
    await createOrUpdateMetaFlowRun(params);

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

  // A re-run must not inherit the last run's answers or its wait marker.
  test("restarts an existing tracking row at the new node with nothing carried over", async () => {
    db.waAutomatedReplyMessage.findFirst.mockResolvedValue({ id: "msg-1" });

    await createOrUpdateMetaFlowRun(params);

    expect(db.waAutomatedReplyMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { currentNode: "node-2", status: "inProgress", response: Prisma.DbNull },
    });
    expect(db.waAutomatedReplyMessage.create).not.toHaveBeenCalled();
  });

  test("defaults an unstated status to in-progress", async () => {
    await createOrUpdateMetaFlowRun(params);

    expect(db.waAutomatedReplyMessage.create.mock.calls[0][0].data.status).toBe("inProgress");
  });

  test("records a completed flow when told to", async () => {
    await createOrUpdateMetaFlowRun({ ...params, status: "completed" });

    expect(db.waAutomatedReplyMessage.create.mock.calls[0][0].data.status).toBe("completed");
  });

  test("matches the tracking row on user, automation and org together", async () => {
    await createOrUpdateMetaFlowRun(params);

    expect(db.waAutomatedReplyMessage.findFirst.mock.calls[0][0].where).toEqual({
      phone: "igs-1",
      waAutomatedReplyId: "ig-auto-1",
      orgId: "org-1",
    });
  });

  test("logs and rethrows when the write fails", async () => {
    db.waAutomatedReplyMessage.create.mockRejectedValue(new Error("db down"));

    await expect(createOrUpdateMetaFlowRun(params)).rejects.toThrow("db down");
  });
});

describe("wasInstagramAutomationSentRecently", () => {
  test("reports true when this automation reached the user within a day", async () => {
    db.waAutomatedReplyMessage.findFirst.mockResolvedValue({ id: "msg-1" });

    await expect(wasInstagramAutomationSentRecently("igs-1", "ig-auto-1", "org-1")).resolves.toBe(
      true,
    );
  });

  test("reports false when nothing was sent recently", async () => {
    await expect(wasInstagramAutomationSentRecently("igs-1", "ig-auto-1", "org-1")).resolves.toBe(
      false,
    );
  });

  // The clock is pinned: under load a real one ticks between reading it here and in the call.
  test("only counts the last day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    try {
      await wasInstagramAutomationSentRecently("igs-1", "ig-auto-1", "org-1");
    } finally {
      vi.useRealTimers();
    }

    const cutoff: Date = db.waAutomatedReplyMessage.findFirst.mock.calls[0][0].where.createdAt.gte;
    expect(cutoff).toEqual(new Date("2026-10-13T12:00:00Z"));
  });

  // A failure here must not resend: reporting false would let the automation fire again.
  test("reports false when the check itself fails", async () => {
    db.waAutomatedReplyMessage.findFirst.mockRejectedValue(new Error("db down"));

    await expect(wasInstagramAutomationSentRecently("igs-1", "ig-auto-1", "org-1")).resolves.toBe(
      false,
    );
    expect(log.error).toHaveBeenCalled();
  });
});

describe("Messenger automations", () => {
  const FB = PlatformType.FACEBOOK;

  test("lists only the org's Messenger automations", async () => {
    await getMetaAutomationsByOrgId("org-1", FB);

    expect(db.waAutomatedReply.findMany.mock.calls[0][0].where).toEqual({
      orgId: "org-1",
      platform: FB,
    });
  });

  test("stores a new automation against Messenger", async () => {
    await createMetaAutomation(FB, { orgId: "org-1", name: "Welcome", matchData: {} });

    expect(db.waAutomatedReply.create.mock.calls[0][0].data.platform).toBe(FB);
  });
});

describe("cloneMetaAutomation", () => {
  const SOURCE = {
    ...AUTOMATION,
    matchData: { json: { nodes: [], edges: [] } },
    whatsappSettingsPhoneId: null,
  };

  test("copies the graph into a new automation on the same platform", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(SOURCE);

    await cloneMetaAutomation("ig-auto-1", "org-1", PlatformType.FACEBOOK, "Second");

    expect(db.waAutomatedReply.findFirst).toHaveBeenCalledWith({
      where: { id: "ig-auto-1", orgId: "org-1", platform: PlatformType.FACEBOOK },
    });
    expect(db.waAutomatedReply.create).toHaveBeenCalledWith({
      data: {
        orgId: "org-1",
        name: "Second",
        matchData: SOURCE.matchData,
        platform: PlatformType.FACEBOOK,
        whatsappSettingsPhoneId: null,
      },
    });
  });

  test("names the copy after the original when no name is given", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(SOURCE);

    await cloneMetaAutomation("ig-auto-1", "org-1", IG);

    expect(db.waAutomatedReply.create.mock.calls[0][0].data.name).toBe("Comment reply Copy");
  });

  test("copies nothing when the org has no such automation on the platform", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(null);

    await expect(cloneMetaAutomation("other", "org-1", IG)).resolves.toBeNull();
    expect(db.waAutomatedReply.create).not.toHaveBeenCalled();
  });
});
