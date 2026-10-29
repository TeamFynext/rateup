import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waAutomatedReply: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    waAutomatedReplyMessage: { findMany: vi.fn() },
    usageStats: { update: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("../../subscription/activeContacts.js", () => ({ canMessageContact: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { getSubscription } from "../../subscription/subscription.service.js";
import { canMessageContact } from "../../subscription/activeContacts.js";
import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import {
  getAutomatedRepliesByKeyWeords,
  getAutomatedReplyById,
  verifyAutomationTriggerLimit,
} from "./wa_automatedReply.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  waAutomatedReply: {
    findMany: Mock;
    findUnique: Mock;
    findFirst: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
  };
  waAutomatedReplyMessage: { findMany: Mock };
  usageStats: { update: Mock };
};

const getSubscriptionMock = getSubscription as unknown as Mock;
const canMessageContactMock = canMessageContact as unknown as Mock;

const AUTOMATION = { id: "auto-1", name: "Greeting", orgId: "org-1" };

beforeEach(() => {
  vi.clearAllMocks();
  db.waAutomatedReply.findMany.mockResolvedValue([AUTOMATION]);
  db.waAutomatedReply.findUnique.mockResolvedValue(AUTOMATION);
  db.waAutomatedReply.findFirst.mockResolvedValue(AUTOMATION);
  db.waAutomatedReply.create.mockResolvedValue(AUTOMATION);
  db.waAutomatedReply.update.mockResolvedValue(AUTOMATION);
  db.waAutomatedReply.delete.mockResolvedValue(AUTOMATION);
  db.waAutomatedReplyMessage.findMany.mockResolvedValue([]);
  db.usageStats.update.mockResolvedValue({});
  getSubscriptionMock.mockResolvedValue({ features: { whatsapp: { active: true } } });
  canMessageContactMock.mockResolvedValue(true);
});

describe("getAutomatedReplyById", () => {
  test("scopes the lookup to the caller's org", async () => {
    await getAutomatedReplyById("auto-1", "org-1");

    expect(db.waAutomatedReply.findFirst.mock.calls[0][0].where).toEqual({
      id: "auto-1",
      orgId: "org-1",
    });
  });

  test("returns null for an unknown id", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(null);

    await expect(getAutomatedReplyById("missing", "org-1")).resolves.toBeNull();
  });

  test("returns null for an automation belonging to another org", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(null);

    await expect(getAutomatedReplyById("auto-victim", "org-attacker")).resolves.toBeNull();
    expect(db.waAutomatedReply.findFirst.mock.calls[0][0].where).toEqual({
      id: "auto-victim",
      orgId: "org-attacker",
    });
  });
});

describe("getAutomatedRepliesByKeyWeords", () => {
  test("searches the stored keyword list within the org", async () => {
    await getAutomatedRepliesByKeyWeords("org-1", "hello");

    expect(db.waAutomatedReply.findFirst).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        matchData: { path: ["keywords"], array_contains: ["hello"] },
      },
    });
  });
});

describe("verifyAutomationTriggerLimit", () => {
  test("allows automations while the WhatsApp feature is active", async () => {
    await expect(verifyAutomationTriggerLimit("org-1")).resolves.toBe(true);
  });

  test("blocks automations once the WhatsApp feature is switched off", async () => {
    getSubscriptionMock.mockResolvedValue({ features: { whatsapp: { active: false } } });

    await expect(verifyAutomationTriggerLimit("org-1")).resolves.toBe(false);
    expect(log.error).toHaveBeenCalled();
  });

  test("blocks a send to a new contact once the active-contact allowance is spent", async () => {
    canMessageContactMock.mockResolvedValue(false);

    await expect(verifyAutomationTriggerLimit("org-1")).resolves.toBe(false);
  });

  test("checks the allowance for the org and recipient it was handed", async () => {
    const recipient = { platform: PlatformType.WHATSAPP, customerId: "919876543210" };

    await verifyAutomationTriggerLimit("org-7", recipient);

    expect(canMessageContactMock).toHaveBeenCalledWith("org-7", recipient);
  });

  test("does not bother checking the allowance once WhatsApp is switched off", async () => {
    getSubscriptionMock.mockResolvedValue({ features: { whatsapp: { active: false } } });

    await verifyAutomationTriggerLimit("org-1");

    expect(canMessageContactMock).not.toHaveBeenCalled();
  });

  // Previously this crashed with a TypeError reading `.features` off a null subscription;
  // it's now treated the same as an inactive WhatsApp feature and blocks cleanly instead.
  test("refuses rather than throwing when the org has no subscription", async () => {
    getSubscriptionMock.mockResolvedValue(null);

    await expect(verifyAutomationTriggerLimit("org-1")).resolves.toBe(false);
    expect(log.error).toHaveBeenCalled();
  });

  test("refuses rather than throwing when the plan has no whatsapp feature at all", async () => {
    getSubscriptionMock.mockResolvedValue({ features: {} });

    await expect(verifyAutomationTriggerLimit("org-1")).resolves.toBe(false);
  });
});
