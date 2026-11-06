import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    channel: { findMany: vi.fn() },
    rule: { findMany: vi.fn() },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("../whatsapp/automatedReply/wa_rule.service.js", () => ({
  createRule: vi.fn(),
}));
vi.mock("../whatsapp/metaChannel/metaChannel.service.js", () => ({
  getMetaChannelById: vi.fn(),
}));
vi.mock("../whatsapp/facebook/messenger_profile.service.js", () => ({
  getMessengerProfile: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { createRule } from "../whatsapp/automatedReply/wa_rule.service.js";
import { getMessengerProfile } from "../whatsapp/facebook/messenger_profile.service.js";
import { getMetaChannelById } from "../whatsapp/metaChannel/metaChannel.service.js";
import {
  CHATBOT_START_KINDS,
  chatbotRules,
  createStartRule,
  DEFAULT_GET_STARTED_PAYLOAD,
  startOffered,
} from "./chatbotStart.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  channel: { findMany: Mock };
  rule: { findMany: Mock };
};
const create = createRule as unknown as Mock;
const metaChannel = getMetaChannelById as unknown as Mock;
const profile = getMessengerProfile as unknown as Mock;

const WA_BOT = { id: "bot-wa", name: "Welcome", platform: "WHATSAPP" as const };
const IG_BOT = {
  id: "bot-ig",
  name: "Welcome",
  platform: "INSTAGRAM" as const,
};
const FB_BOT = { id: "bot-fb", name: "Welcome", platform: "FACEBOOK" as const };

/** The rule input createRule was handed. */
const created = () => create.mock.calls[0]![0];

beforeEach(() => {
  vi.clearAllMocks();
  db.channel.findMany.mockResolvedValue([{ id: "ch-1", accountId: "acc-1" }]);
  db.rule.findMany.mockResolvedValue([]);
  create.mockImplementation(async (input) => ({ id: "rule-1", ...input }));
});

describe("startOffered", () => {
  test("matches the wizard's options per channel", () => {
    const offered = (platform: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK") =>
      CHATBOT_START_KINDS.filter((kind) => startOffered(platform, kind));
    expect(offered("WHATSAPP")).toEqual(["keyword", "any", "leadad"]);
    expect(offered("INSTAGRAM")).toEqual(["keyword", "comment", "story", "storyreply", "link"]);
    expect(offered("FACEBOOK")).toEqual(["keyword", "comment", "link", "getstarted"]);
  });
});

describe("createStartRule", () => {
  test("a keyword start makes a switched-off rule with an empty keyword", async () => {
    const result = await createStartRule("org-1", WA_BOT, {
      kind: "keyword",
      accountId: "acc-1",
    });
    expect(result).toEqual({
      rule: { id: "rule-1", name: "Welcome · start", isActive: false },
    });
    expect(created()).toMatchObject({
      orgId: "org-1",
      isActive: false,
      triggerEvent: "MESSAGE_RECEIVED",
      platforms: ["WHATSAPP"],
      whatsappSettingsPhoneIds: ["acc-1"],
      groups: [
        {
          conditions: [{ field: "MESSAGE_BODY", operator: "CONTAINS", value: "" }],
        },
      ],
      actions: [{ type: "TRIGGER_CHATBOT", value: "bot-wa" }],
    });
    expect(db.channel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org-1", platform: "WHATSAPP", accountId: "acc-1" },
      }),
    );
  });

  test("any message answers once a day, on every message", async () => {
    await createStartRule("org-1", WA_BOT, { kind: "any" });
    expect(created()).toMatchObject({
      groups: [{ conditions: [{ value: "*" }] }],
      options: { sendOncePerDay: true },
    });
  });

  test("with no account picked, the rule runs on every connected one", async () => {
    db.channel.findMany.mockResolvedValue([
      { id: "ch-1", accountId: "acc-1" },
      { id: "ch-2", accountId: "acc-2" },
    ]);
    await createStartRule("org-1", IG_BOT, { kind: "story" });
    expect(created()).toMatchObject({
      triggerEvent: "INSTAGRAM_STORY_MENTION",
      whatsappSettingsPhoneIds: ["acc-1", "acc-2"],
    });
  });

  test("an Instagram comment start covers every post", async () => {
    await createStartRule("org-1", IG_BOT, { kind: "comment" });
    expect(created()).toMatchObject({
      triggerEvent: "INSTAGRAM_COMMENT",
      options: { instagramScope: "ALL", instagramCommentSource: "POSTS" },
    });
  });

  test("Get Started answers the payload the Page already sends", async () => {
    metaChannel.mockResolvedValue({
      platform: "FACEBOOK",
      pageAccessToken: "tok",
    });
    profile.mockResolvedValue({ getStarted: "START_HERE" });
    await createStartRule("org-1", FB_BOT, { kind: "getstarted" });
    expect(metaChannel).toHaveBeenCalledWith("ch-1", "org-1");
    expect(created()).toMatchObject({
      triggerEvent: "MESSAGE_RECEIVED",
      groups: [{ conditions: [{ operator: "EQUALS", value: "START_HERE" }] }],
    });
  });

  test("Get Started on several Pages answers each Page's own payload", async () => {
    db.channel.findMany.mockResolvedValue([
      { id: "ch-1", accountId: "page-1" },
      { id: "ch-2", accountId: "page-2" },
      { id: "ch-3", accountId: "page-3" },
    ]);
    metaChannel.mockResolvedValue({
      platform: "FACEBOOK",
      pageAccessToken: "tok",
    });
    profile
      .mockResolvedValueOnce({ getStarted: "START_A" })
      .mockResolvedValueOnce({ getStarted: "START_B" })
      .mockResolvedValueOnce({ getStarted: "START_A" });
    await createStartRule("org-1", FB_BOT, { kind: "getstarted" });
    expect(created()).toMatchObject({
      whatsappSettingsPhoneIds: ["page-1", "page-2", "page-3"],
      groups: [
        {
          operator: "OR",
          conditions: [
            { operator: "EQUALS", value: "START_A" },
            { operator: "EQUALS", value: "START_B" },
          ],
        },
      ],
    });
  });

  test("Get Started falls back to the default payload when the Page can't be read", async () => {
    metaChannel.mockResolvedValue({
      platform: "FACEBOOK",
      pageAccessToken: "tok",
    });
    profile.mockRejectedValue(new Error("Meta said no"));
    await createStartRule("org-1", FB_BOT, { kind: "getstarted" });
    expect(created()).toMatchObject({
      groups: [{ conditions: [{ value: DEFAULT_GET_STARTED_PAYLOAD }] }],
    });
  });

  test("a lead ad needs no rule", async () => {
    expect(await createStartRule("org-1", WA_BOT, { kind: "leadad" })).toEqual({
      rule: null,
      skipped: "not_needed",
    });
    expect(create).not.toHaveBeenCalled();
  });

  test("no connected account, no rule", async () => {
    db.channel.findMany.mockResolvedValue([]);
    expect(await createStartRule("org-1", IG_BOT, { kind: "link" })).toEqual({
      rule: null,
      skipped: "no_account",
    });
    expect(create).not.toHaveBeenCalled();
  });

  test("a rule name already taken gets a number", async () => {
    db.rule.findMany.mockResolvedValue([
      { name: "Welcome · start" },
      { name: "Welcome · start 2" },
    ]);
    await createStartRule("org-1", IG_BOT, { kind: "keyword" });
    expect(created().name).toBe("Welcome · start 3");
  });

  test("a failed rule never fails the chatbot", async () => {
    create.mockRejectedValue(new Error("Keyword '*' is already used"));
    expect(await createStartRule("org-1", WA_BOT, { kind: "any" })).toEqual({
      rule: null,
      skipped: "failed",
    });
  });
});

describe("chatbotRules", () => {
  test("finds the rules that trigger the chatbot, with their keywords", async () => {
    db.rule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        name: "Welcome · start",
        isActive: false,
        triggerEvent: "MESSAGE_RECEIVED",
        whatsappSettingsPhoneIds: ["acc-1"],
        groups: [
          {
            conditions: [
              { field: "MESSAGE_BODY", value: "" },
              { field: "CONTACT_LABEL", value: "vip" },
            ],
          },
        ],
      },
    ]);
    expect(await chatbotRules("bot-1", "org-1")).toEqual([
      {
        id: "rule-1",
        name: "Welcome · start",
        isActive: false,
        triggerEvent: "MESSAGE_RECEIVED",
        accountIds: ["acc-1"],
        keywords: [""],
      },
    ]);
    expect(db.rule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orgId: "org-1",
          actions: {
            some: { type: "TRIGGER_CHATBOT", value: { equals: "bot-1" } },
          },
        },
      }),
    );
  });
});
