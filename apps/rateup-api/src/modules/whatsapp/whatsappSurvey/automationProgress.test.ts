import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/redisConnection.js", () => ({
  default: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waAutomatedReply: { findFirst: vi.fn() },
    waAutomatedReplyMessage: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

import connection from "../../../utils/redisConnection.js";
import prisma from "../../../utils/prisma.js";
import {
  getAutomationPosition,
  moveAutomationPosition,
  POSITION_TTL_SECONDS,
  setAutomationPosition,
} from "./automationProgress.js";
import { findRecentAutomation, logAutomationAction } from "./automation-logger.utils.js";

type Mock = ReturnType<typeof vi.fn>;
const redis = connection as unknown as { get: Mock; set: Mock };
const db = prisma as unknown as {
  waAutomatedReply: { findFirst: Mock };
  waAutomatedReplyMessage: { findFirst: Mock; create: Mock };
};

const ORG = "org-1";
const PHONE = "919000000001";
const KEY = `wa_automation_position:${ORG}:${PHONE}`;
const AUTOMATION = { id: "auto-1", matchData: { json: {} }, whatsappSettingsPhoneId: "pn-1" };

function stored(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    automationId: "auto-1",
    currentNode: "node-2",
    logId: "log-1",
    loggedAt: Date.now(),
    ...over,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  redis.get.mockResolvedValue(null);
  redis.set.mockResolvedValue("OK");
  db.waAutomatedReply.findFirst.mockResolvedValue(AUTOMATION);
  db.waAutomatedReplyMessage.findFirst.mockResolvedValue(null);
  db.waAutomatedReplyMessage.create.mockResolvedValue({ id: "log-9" });
});

describe("the position store", () => {
  test("writes the position with a TTL", async () => {
    await setAutomationPosition(ORG, PHONE, {
      automationId: "auto-1",
      currentNode: "node-1",
      logId: "log-1",
    });

    expect(redis.set).toHaveBeenCalledWith(KEY, expect.any(String), "EX", POSITION_TTL_SECONDS);
    expect(JSON.parse(redis.set.mock.calls[0][1])).toMatchObject({
      automationId: "auto-1",
      currentNode: "node-1",
      logId: "log-1",
    });
  });

  test("discards unreadable or malformed state rather than throwing", async () => {
    redis.get.mockResolvedValueOnce("{not json");
    await expect(getAutomationPosition(ORG, PHONE)).resolves.toBeNull();

    redis.get.mockResolvedValueOnce(JSON.stringify({ automationId: "auto-1" }));
    await expect(getAutomationPosition(ORG, PHONE)).resolves.toBeNull();
  });

  test("a Redis outage costs the position, not the webhook", async () => {
    redis.set.mockRejectedValue(new Error("ECONNRESET"));

    await expect(
      setAutomationPosition(ORG, PHONE, { automationId: "a", currentNode: "n", logId: null }),
    ).resolves.toBeUndefined();
  });

  test("advancing keeps the TTL and the time the step was logged", async () => {
    redis.get.mockResolvedValue(stored({ loggedAt: 1000 }));

    await moveAutomationPosition(ORG, PHONE, "auto-1", "node-3");

    expect(redis.set).toHaveBeenCalledWith(KEY, expect.any(String), "KEEPTTL");
    expect(JSON.parse(redis.set.mock.calls[0][1])).toMatchObject({
      currentNode: "node-3",
      loggedAt: 1000,
    });
  });

  // The log-based version rewrote only that automation's rows, which left a
  // contact whose newest step was in another automation where they were.
  test("does not move a contact who is in a different automation", async () => {
    redis.get.mockResolvedValue(stored({ automationId: "auto-other" }));

    await moveAutomationPosition(ORG, PHONE, "auto-1", "node-3");

    expect(redis.set).not.toHaveBeenCalled();
  });
});

describe("logAutomationAction", () => {
  test("logs the step and makes it the contact's position", async () => {
    await logAutomationAction({
      phone: PHONE,
      nodeId: "node-1",
      automationId: "auto-1",
      orgId: ORG,
    });

    expect(db.waAutomatedReplyMessage.create).toHaveBeenCalled();
    expect(JSON.parse(redis.set.mock.calls[0][1])).toMatchObject({
      automationId: "auto-1",
      currentNode: "node-1",
      logId: "log-9",
    });
  });

  test("leaves the position alone when the log write fails", async () => {
    db.waAutomatedReplyMessage.create.mockRejectedValue(new Error("P2028"));

    await expect(
      logAutomationAction({ phone: PHONE, nodeId: "node-1", automationId: "auto-1", orgId: ORG }),
    ).resolves.toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });
});

describe("findRecentAutomation", () => {
  test("answers from the Redis position without querying the log", async () => {
    redis.get.mockResolvedValue(stored());

    const res = await findRecentAutomation(PHONE, ORG, { timeWindow: 60_000 });

    expect(res).toEqual({
      id: "log-1",
      currentNode: "node-2",
      waAutomatedReplyId: "auto-1",
      waAutomatedReply: AUTOMATION,
    });
    expect(db.waAutomatedReply.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "auto-1", orgId: ORG } }),
    );
    expect(db.waAutomatedReplyMessage.findFirst).not.toHaveBeenCalled();
  });

  test("ignores a position whose last step is outside the window", async () => {
    redis.get.mockResolvedValue(stored({ loggedAt: Date.now() - 5 * 60 * 60 * 1000 }));

    await expect(
      findRecentAutomation(PHONE, ORG, { timeWindow: 4 * 60 * 60 * 1000 }),
    ).resolves.toBeNull();
    expect(db.waAutomatedReplyMessage.findFirst).not.toHaveBeenCalled();
  });

  test("returns nothing when the automation has since been deleted", async () => {
    redis.get.mockResolvedValue(stored());
    db.waAutomatedReply.findFirst.mockResolvedValue(null);

    await expect(findRecentAutomation(PHONE, ORG)).resolves.toBeNull();
  });

  // Contacts part-way through a bot when positions moved to Redis have no key yet.
  test("falls back to the newest log row when there is no position", async () => {
    const row = {
      id: "log-old",
      currentNode: "node-5",
      waAutomatedReplyId: "auto-1",
      waAutomatedReply: AUTOMATION,
    };
    db.waAutomatedReplyMessage.findFirst.mockResolvedValue(row);

    await expect(findRecentAutomation(PHONE, ORG, { timeWindow: 60_000 })).resolves.toEqual(row);
    const where = db.waAutomatedReplyMessage.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ phone: PHONE, orgId: ORG });
    expect(where.createdAt.gte).toBeInstanceOf(Date);
  });
});
