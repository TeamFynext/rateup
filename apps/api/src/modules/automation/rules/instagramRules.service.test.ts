import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

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
import { Prisma } from "../../../generated/prisma/client.js";
import { PlatformType } from "../../../generated/prisma/enums.js";
import {
  createOrUpdateMetaFlowRun,
  getMetaAutomationById,
  logMetaFlowAction,
} from "./instagramRules.service.js";

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
