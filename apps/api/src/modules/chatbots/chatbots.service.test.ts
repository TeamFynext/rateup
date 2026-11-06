import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    waAutomatedReply: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    usageStats: { updateMany: vi.fn() },
    waAutomatedReplyMessage: { groupBy: vi.fn() },
  },
}));
vi.mock("../subscription/subscription.service.js", () => ({
  getSubscriptionGate: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { getSubscriptionGate } from "../subscription/subscription.service.js";
import {
  cloneChatbot,
  createChatbot,
  deleteChatbot,
  getChatbot,
  listChatbots,
  updateChatbot,
  whatsappLock,
} from "./chatbots.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  waAutomatedReply: Record<"findMany" | "findFirst" | "create" | "update" | "delete", Mock>;
  usageStats: { updateMany: Mock };
  waAutomatedReplyMessage: { groupBy: Mock };
};
const gate = getSubscriptionGate as unknown as Mock;

const FUTURE = new Date(Date.now() + 86_400_000);
const PAST = new Date(Date.now() - 86_400_000);
const withWhatsapp = {
  features: { whatsapp: { active: true } },
  expiresAt: FUTURE,
};
const withoutWhatsapp = {
  features: { whatsapp: { active: false } },
  expiresAt: FUTURE,
};

beforeEach(() => {
  vi.clearAllMocks();
  gate.mockResolvedValue(withWhatsapp);
  db.waAutomatedReply.findMany.mockResolvedValue([]);
  db.waAutomatedReplyMessage.groupBy.mockResolvedValue([]);
});

describe("whatsappLock", () => {
  test("open with an active WhatsApp feature", async () => {
    expect(await whatsappLock("org-1", { write: true })).toBeNull();
  });

  test("no subscription locks reads and writes", async () => {
    gate.mockResolvedValue(null);
    expect(await whatsappLock("org-1", { write: false })).toBe("no_subscription");
  });

  test("a plan without WhatsApp is locked", async () => {
    gate.mockResolvedValue(withoutWhatsapp);
    expect(await whatsappLock("org-1", { write: false })).toBe("not_in_plan");
  });

  test("an expired subscription still reads but can't write", async () => {
    gate.mockResolvedValue({ ...withWhatsapp, expiresAt: PAST });
    expect(await whatsappLock("org-1", { write: false })).toBeNull();
    expect(await whatsappLock("org-1", { write: true })).toBe("subscription_expired");
  });
});

describe("listChatbots", () => {
  test("lists every channel of the org, with a step count and no graph", async () => {
    db.waAutomatedReply.findMany.mockResolvedValue([
      {
        id: "a",
        name: "Welcome",
        platform: "INSTAGRAM",
        createdAt: PAST,
        whatsappSettingsPhoneId: null,
        matchData: {
          json: {
            nodes: [
              { type: "startNode" },
              { type: "textNode" },
              { type: "textNode" },
              { type: "imageNode" },
            ],
            edges: [{}],
          },
        },
      },
      {
        id: "b",
        name: "FAQ",
        platform: "WHATSAPP",
        createdAt: PAST,
        whatsappSettingsPhoneId: "phone-1",
        matchData: {},
      },
    ]);

    const result = await listChatbots("org-1");

    expect(db.waAutomatedReply.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orgId: "org-1",
          platform: { in: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"] },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(result.locked).toEqual({});
    expect(result.data).toEqual([
      expect.objectContaining({ id: "a", platform: "INSTAGRAM", stepCount: 3 }),
      expect.objectContaining({ id: "b", platform: "WHATSAPP", stepCount: 0 }),
    ]);
    expect(result.data[0]).not.toHaveProperty("matchData");
  });

  test("sends each graph when asked for it", async () => {
    const matchData = { json: { nodes: [{ type: "startNode" }] } };
    db.waAutomatedReply.findMany.mockResolvedValue([
      { id: "a", name: "Menu", platform: "WHATSAPP", createdAt: PAST, matchData },
    ]);
    const result = await listChatbots("org-1", undefined, { withGraph: true });
    expect(result.data[0]).toMatchObject({ id: "a", matchData });
  });

  test("searches names in the database, any case", async () => {
    db.waAutomatedReply.findMany.mockResolvedValue([]);
    await listChatbots("org-1", undefined, { search: "menu" });
    expect(db.waAutomatedReply.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: { contains: "menu", mode: "insensitive" } }),
      }),
    );
  });

  test("counts each chatbot's runs: all started, and those completed", async () => {
    db.waAutomatedReply.findMany.mockResolvedValue([
      { id: "a", name: "A", platform: "INSTAGRAM", matchData: {} },
      { id: "b", name: "B", platform: "INSTAGRAM", matchData: {} },
    ]);
    db.waAutomatedReplyMessage.groupBy.mockResolvedValue([
      { waAutomatedReplyId: "a", status: "completed", _count: { _all: 4 } },
      { waAutomatedReplyId: "a", status: "inProgress", _count: { _all: 2 } },
      { waAutomatedReplyId: "a", status: "paused", _count: { _all: 1 } },
    ]);

    const result = await listChatbots("org-1", "INSTAGRAM");

    expect(db.waAutomatedReplyMessage.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org-1", waAutomatedReplyId: { in: ["a", "b"] } },
      }),
    );
    expect(result.data.map((bot) => bot.runs)).toEqual([
      { started: 7, completed: 4 },
      { started: 0, completed: 0 },
    ]);
  });

  test("WhatsApp is left out and named as locked when the plan lacks it", async () => {
    gate.mockResolvedValue(withoutWhatsapp);
    const result = await listChatbots("org-1");
    expect(db.waAutomatedReply.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org-1", platform: { in: ["INSTAGRAM", "FACEBOOK"] } },
      }),
    );
    expect(result.locked).toEqual({ WHATSAPP: "not_in_plan" });
  });

  test("one channel only, and no query at all when that channel is locked", async () => {
    await listChatbots("org-1", "FACEBOOK");
    expect(db.waAutomatedReply.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org-1", platform: { in: ["FACEBOOK"] } },
      }),
    );
    expect(gate).not.toHaveBeenCalled();

    gate.mockResolvedValue(null);
    db.waAutomatedReply.findMany.mockClear();
    const result = await listChatbots("org-1", "WHATSAPP");
    expect(db.waAutomatedReply.findMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: [],
      locked: { WHATSAPP: "no_subscription" },
    });
  });
});

describe("single-chatbot writes", () => {
  const matchData = {
    json: { nodes: [], edges: [] },
  } as WaAutomatedReplyMatchData;

  test("get is scoped to the org", async () => {
    await getChatbot("bot-1", "org-1");
    expect(db.waAutomatedReply.findFirst).toHaveBeenCalledWith({
      where: { id: "bot-1", orgId: "org-1" },
    });
  });

  test("creating a WhatsApp chatbot counts it in usage stats", async () => {
    db.waAutomatedReply.create.mockResolvedValue({ id: "bot-1" });
    await createChatbot("org-1", {
      name: "Hi",
      platform: "WHATSAPP",
      matchData,
    });
    expect(db.waAutomatedReply.create).toHaveBeenCalledWith({
      data: {
        orgId: "org-1",
        name: "Hi",
        platform: "WHATSAPP",
        matchData,
        whatsappSettingsPhoneId: null,
      },
    });
    expect(db.usageStats.updateMany).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      data: { waAutomationCount: { increment: 1 } },
    });
  });

  test("creating a Messenger chatbot does not", async () => {
    await createChatbot("org-1", {
      name: "Hi",
      platform: "FACEBOOK",
      matchData,
    });
    expect(db.usageStats.updateMany).not.toHaveBeenCalled();
  });

  test("update never writes the channel", async () => {
    await updateChatbot("bot-1", "org-1", { name: "New name" });
    const call = db.waAutomatedReply.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "bot-1", orgId: "org-1" });
    expect(call.data).not.toHaveProperty("platform");
  });

  test("clone keeps the channel and number, and names the copy", async () => {
    const source = {
      name: "FAQ",
      platform: "WHATSAPP",
      matchData,
      whatsappSettingsPhoneId: "p1",
    };
    await cloneChatbot(source, "org-1");
    expect(db.waAutomatedReply.create).toHaveBeenCalledWith({
      data: {
        orgId: "org-1",
        name: "FAQ Copy",
        platform: "WHATSAPP",
        matchData,
        whatsappSettingsPhoneId: "p1",
      },
    });
    await cloneChatbot(source, "org-1", "Second FAQ");
    expect(db.waAutomatedReply.create.mock.calls[1][0].data.name).toBe("Second FAQ");
  });

  test("delete is scoped to the org", async () => {
    await deleteChatbot("bot-1", "org-1");
    expect(db.waAutomatedReply.delete).toHaveBeenCalledWith({
      where: { id: "bot-1", orgId: "org-1" },
    });
  });
});
