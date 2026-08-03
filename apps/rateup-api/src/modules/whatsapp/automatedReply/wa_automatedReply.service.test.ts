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
    waAutomatedReplyCommands: { findMany: vi.fn() },
    usageStats: { update: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("../whatsappSurvey/wasurvey.auth.js", () => ({
  checkConversationLimitAvailable: vi.fn(),
}));
vi.mock("./wa_automatedReply.utils.js", () => ({
  selectAutomationByBusinessHours: vi.fn((list: unknown[]) => list[0]),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { getSubscription } from "../../subscription/subscription.service.js";
import { checkConversationLimitAvailable } from "../whatsappSurvey/wasurvey.auth.js";
import {
  type automationProps,
  selectAutomationByBusinessHours,
} from "./wa_automatedReply.utils.js";
import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import {
  cloneAutomatedReply,
  createAutomatedReply,
  deleteAutomatedReply,
  getAutomatedRepliesByKeyWeords,
  getAutomatedRepliesByOrgId,
  getAutomatedRepliesMessagId,
  getAutomatedReplyById,
  getCommandByOrgIdAndCommand,
  updateAutomatedReply,
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
  waAutomatedReplyCommands: { findMany: Mock };
  usageStats: { update: Mock };
};

const getSubscriptionMock = getSubscription as unknown as Mock;
const checkConversationLimitMock = checkConversationLimitAvailable as unknown as Mock;
const selectByHoursMock = selectAutomationByBusinessHours as unknown as Mock;

const AUTOMATION = { id: "auto-1", name: "Greeting", orgId: "org-1" };

beforeEach(() => {
  vi.clearAllMocks();
  db.waAutomatedReply.findMany.mockResolvedValue([AUTOMATION]);
  db.waAutomatedReply.findUnique.mockResolvedValue({
    ...AUTOMATION,
    WaAutomatedReplyCommands: [{ command: "hello", businessHourId: "bh-1" }],
  });
  db.waAutomatedReply.findFirst.mockResolvedValue({
    ...AUTOMATION,
    WaAutomatedReplyCommands: [{ command: "hello", businessHourId: "bh-1" }],
  });
  db.waAutomatedReply.create.mockResolvedValue(AUTOMATION);
  db.waAutomatedReply.update.mockResolvedValue(AUTOMATION);
  db.waAutomatedReply.delete.mockResolvedValue(AUTOMATION);
  db.waAutomatedReplyMessage.findMany.mockResolvedValue([]);
  db.waAutomatedReplyCommands.findMany.mockResolvedValue([]);
  db.usageStats.update.mockResolvedValue({});
  getSubscriptionMock.mockResolvedValue({ features: { whatsapp: { active: true } } });
  checkConversationLimitMock.mockResolvedValue(true);
  selectByHoursMock.mockImplementation((list: unknown[]) => list[0]);
});

describe("getAutomatedRepliesMessagId", () => {
  test("lists the automation's messages within the caller's org", async () => {
    await getAutomatedRepliesMessagId("auto-1", "org-1");

    expect(db.waAutomatedReplyMessage.findMany).toHaveBeenCalledWith({
      where: { waAutomatedReplyId: "auto-1", orgId: "org-1" },
    });
  });
});

describe("getAutomatedRepliesByOrgId", () => {
  test("lists the org's WhatsApp automations, newest first", async () => {
    const result = await getAutomatedRepliesByOrgId("org-1");

    expect(db.waAutomatedReply.findMany.mock.calls[0][0]).toMatchObject({
      where: { orgId: "org-1", platform: PlatformType.WHATSAPP },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual([AUTOMATION]);
  });

  // Instagram automations live in the same table but are listed by their own endpoint.
  test("leaves Instagram automations out of the WhatsApp list", async () => {
    await getAutomatedRepliesByOrgId("org-1");

    expect(db.waAutomatedReply.findMany.mock.calls[0][0].where.platform).toBe(
      PlatformType.WHATSAPP,
    );
  });
});

describe("getAutomatedReplyById", () => {
  test("flattens the stored commands into a plain keyword list", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue({
      ...AUTOMATION,
      WaAutomatedReplyCommands: [
        { command: "hello", businessHourId: "bh-1" },
        { command: "hi", businessHourId: "bh-1" },
      ],
    });

    const result = await getAutomatedReplyById("auto-1", "org-1");

    expect(result?.commands).toEqual(["hello", "hi"]);
    expect(result).not.toHaveProperty("WaAutomatedReplyCommands");
  });

  test("scopes the lookup to the caller's org", async () => {
    await getAutomatedReplyById("auto-1", "org-1");

    expect(db.waAutomatedReply.findFirst.mock.calls[0][0].where).toEqual({
      id: "auto-1",
      orgId: "org-1",
    });
  });

  test("lifts the business hours off the first command", async () => {
    const result = await getAutomatedReplyById("auto-1", "org-1");

    expect(result?.businessHourId).toBe("bh-1");
  });

  test("reports no business hours when the automation has no commands", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue({
      ...AUTOMATION,
      WaAutomatedReplyCommands: [],
    });

    const result = await getAutomatedReplyById("auto-1", "org-1");

    expect(result?.commands).toEqual([]);
    expect(result?.businessHourId).toBeUndefined();
  });

  // Previously this destructured the result with no null check, throwing a bare
  // TypeError for an unknown id. It now returns null, which the controller answers 404.
  test("returns null rather than throwing for an unknown id", async () => {
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

describe("createAutomatedReply", () => {
  test("creates the automation against the caller's org", async () => {
    await createAutomatedReply(
      {
        name: "Greeting",
        matchData: { keywords: ["hi"] },
        whatsappSettingsPhoneId: "phone-1",
      } as any,
      "org-1",
    );

    expect(db.waAutomatedReply.create.mock.calls[0][0].data).toMatchObject({
      orgId: "org-1",
      name: "Greeting",
      matchData: { keywords: ["hi"] },
      whatsappSettingsPhoneId: "phone-1",
    });
  });

  test.each([
    ["instagram", PlatformType.INSTAGRAM],
    ["whatsapp", PlatformType.WHATSAPP],
    [undefined, PlatformType.WHATSAPP],
  ])("stores platform %s as %s", async (platform, expected) => {
    await createAutomatedReply({ name: "A", platform } as any, "org-1");

    expect(db.waAutomatedReply.create.mock.calls[0][0].data.platform).toBe(expected);
  });

  // Anything that is not the string "instagram" falls back to WhatsApp.
  test("treats an unrecognised platform as WhatsApp", async () => {
    await createAutomatedReply({ name: "A", platform: "telegram" } as any, "org-1");

    expect(db.waAutomatedReply.create.mock.calls[0][0].data.platform).toBe(PlatformType.WHATSAPP);
  });

  test("counts the new automation against the org's usage", async () => {
    await createAutomatedReply({ name: "A" } as any, "org-1");

    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      data: { waAutomationCount: { increment: 1 } },
    });
  });

  test("does not touch usage when nothing was created", async () => {
    db.waAutomatedReply.create.mockResolvedValue(null);

    await createAutomatedReply({ name: "A" } as any, "org-1");

    expect(db.usageStats.update).not.toHaveBeenCalled();
  });
});

describe("cloneAutomatedReply", () => {
  test("copies the automation's matching rules under a new name", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue({
      id: "auto-1",
      name: "Greeting",
      matchData: { keywords: ["hi"] },
      platform: PlatformType.WHATSAPP,
    });

    await cloneAutomatedReply("auto-1", "org-1", "Greeting v2");

    expect(db.waAutomatedReply.create.mock.calls[0][0].data).toEqual({
      orgId: "org-1",
      name: "Greeting v2",
      matchData: { keywords: ["hi"] },
      platform: PlatformType.WHATSAPP,
    });
  });

  test("names the copy after the original when no name is given", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue({ name: "Greeting", matchData: {} });

    await cloneAutomatedReply("auto-1", "org-1");

    expect(db.waAutomatedReply.create.mock.calls[0][0].data.name).toBe("Greeting Copy");
  });

  test("only clones an automation the caller's org owns", async () => {
    await cloneAutomatedReply("auto-1", "org-1");

    expect(db.waAutomatedReply.findFirst).toHaveBeenCalledWith({
      where: { id: "auto-1", orgId: "org-1" },
    });
  });

  test("refuses to clone something this org does not have", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(null);

    await expect(cloneAutomatedReply("auto-other", "org-1")).rejects.toThrow(
      "Automated reply not found",
    );
    expect(db.waAutomatedReply.create).not.toHaveBeenCalled();
  });

  // The copy deliberately starts unattached to a number and without keywords.
  test("does not carry the phone number over to the copy", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue({
      name: "Greeting",
      matchData: {},
      whatsappSettingsPhoneId: "phone-1",
    });

    await cloneAutomatedReply("auto-1", "org-1");

    expect(db.waAutomatedReply.create.mock.calls[0][0].data).not.toHaveProperty(
      "whatsappSettingsPhoneId",
    );
  });

  test("does not count the copy against the org's usage", async () => {
    await cloneAutomatedReply("auto-1", "org-1");

    expect(db.usageStats.update).not.toHaveBeenCalled();
  });
});

describe("updateAutomatedReply", () => {
  test("applies the change to the named automation", async () => {
    await updateAutomatedReply(
      "auto-1",
      { name: "Renamed", matchData: { keywords: ["hey"] } },
      "org-1",
    );

    expect(db.waAutomatedReply.update.mock.calls[0][0]).toMatchObject({
      where: { id: "auto-1" },
      data: { name: "Renamed", matchData: { keywords: ["hey"] } },
    });
  });

  test("leaves the platform alone when the change does not mention it", async () => {
    await updateAutomatedReply("auto-1", { name: "Renamed" }, "org-1");

    expect(db.waAutomatedReply.update.mock.calls[0][0].data.platform).toBeUndefined();
  });

  test("switches the platform when the change names one", async () => {
    await updateAutomatedReply("auto-1", { platform: "instagram" }, "org-1");

    expect(db.waAutomatedReply.update.mock.calls[0][0].data.platform).toBe(PlatformType.INSTAGRAM);
  });

  test("confirms the org owns the automation before writing", async () => {
    await updateAutomatedReply("auto-1", { name: "Renamed" }, "org-1");

    expect(db.waAutomatedReply.findFirst).toHaveBeenCalledWith({
      where: { id: "auto-1", orgId: "org-1" },
      select: { id: true },
    });
  });

  test("refuses to rewrite another org's automation", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(null);

    await expect(
      updateAutomatedReply("auto-victim", { name: "hijacked" }, "org-attacker"),
    ).rejects.toThrow("Automated reply not found");
    expect(db.waAutomatedReply.update).not.toHaveBeenCalled();
  });
});

describe("deleteAutomatedReply", () => {
  test("deletes the named automation once the org is confirmed to own it", async () => {
    await deleteAutomatedReply("auto-1", "org-1");

    expect(db.waAutomatedReply.findFirst).toHaveBeenCalledWith({
      where: { id: "auto-1", orgId: "org-1" },
      select: { id: true },
    });
    expect(db.waAutomatedReply.delete).toHaveBeenCalledWith({ where: { id: "auto-1" } });
  });

  test("refuses to delete another org's automation", async () => {
    db.waAutomatedReply.findFirst.mockResolvedValue(null);

    await expect(deleteAutomatedReply("auto-victim", "org-attacker")).rejects.toThrow(
      "Automated reply not found",
    );
    expect(db.waAutomatedReply.delete).not.toHaveBeenCalled();
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

describe("getCommandByOrgIdAndCommand", () => {
  test("looks the command up in the org and picks by business hours", async () => {
    const commands: {
      command: string;
      waAutomatedReplyId: string;
      businessHour: automationProps["businessHour"];
    }[] = [{ command: "hello", waAutomatedReplyId: "auto-1", businessHour: null }];
    db.waAutomatedReplyCommands.findMany.mockResolvedValue(commands);

    const result = await getCommandByOrgIdAndCommand("org-1", "hello");

    expect(db.waAutomatedReplyCommands.findMany.mock.calls[0][0].where).toEqual({
      orgId: "org-1",
      command: "hello",
    });
    expect(selectByHoursMock).toHaveBeenCalledWith(commands);
    expect(result).toBe(commands[0]);
  });

  test("selects nothing when the org has no such command", async () => {
    selectByHoursMock.mockReturnValue(undefined);

    await expect(getCommandByOrgIdAndCommand("org-1", "nope")).resolves.toBeUndefined();
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

  // The limit enforced is the conversation allowance the plans actually define
  // (whatsapp.conversation.count.max), checked via checkConversationLimitAvailable —
  // which answers true while the org is still within it.
  test("blocks an org that has used up its conversation allowance", async () => {
    checkConversationLimitMock.mockResolvedValue(false);

    await expect(verifyAutomationTriggerLimit("org-1")).resolves.toBe(false);
  });

  test("checks the allowance for the org it was handed", async () => {
    await verifyAutomationTriggerLimit("org-7");

    expect(checkConversationLimitMock).toHaveBeenCalledWith("org-7");
  });

  test("does not bother checking the allowance once WhatsApp is switched off", async () => {
    getSubscriptionMock.mockResolvedValue({ features: { whatsapp: { active: false } } });

    await verifyAutomationTriggerLimit("org-1");

    expect(checkConversationLimitMock).not.toHaveBeenCalled();
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
