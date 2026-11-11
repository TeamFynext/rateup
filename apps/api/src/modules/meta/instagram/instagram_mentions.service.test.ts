import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

/* An in-memory InstagramMention table, so redelivery, claims and cooldowns behave as they
   would against Postgres. Only the filter shapes the service uses are understood. */
type Row = Record<string, unknown> & { id: string };
const mentions: Row[] = [];

function matches(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, cond]) => {
    const value = row[key];
    if (cond !== null && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as { not?: unknown; lt?: Date; gte?: Date };
      if ("not" in c && value === c.not) return false;
      if (c.lt && !(value instanceof Date && value < c.lt)) return false;
      if (c.gte && !(value instanceof Date && value >= c.gte)) return false;
      return true;
    }
    return (value ?? null) === cond;
  });
}

const db = vi.hoisted(() => ({
  instagramMention: {} as Record<string, ReturnType<typeof vi.fn>>,
  loyaltyProgram: { findUnique: vi.fn() },
  customerLoyaltyAccount: { findUnique: vi.fn() },
  contact: { findUnique: vi.fn(), findFirst: vi.fn() },
  loyaltyEventTrigger: { findUnique: vi.fn() },
}));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../loyalty/earningRules/triggerRules.js", async (importActual) => ({
  ...(await importActual<typeof import("../../loyalty/earningRules/triggerRules.js")>()),
  findInstagramMentionRule: vi.fn(),
}));
vi.mock("../../loyalty/instagramMentions/mentionPoints.js", () => ({
  creditInstagramMention: vi.fn(),
}));
vi.mock("../../loyalty/messaging/send.js", () => ({
  sendLoyaltyEvent: vi.fn(),
  loadProgramForSend: vi.fn(),
}));
vi.mock("../channels/metaChannel.service.js", () => ({ getInstagramChannel: vi.fn() }));
vi.mock("../whatsapp/wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("./instagram_messaging.service.js", () => ({ sendInstagramTextMessage: vi.fn() }));

import { findInstagramMentionRule } from "../../loyalty/earningRules/triggerRules.js";
import { creditInstagramMention } from "../../loyalty/instagramMentions/mentionPoints.js";
import { loadProgramForSend, sendLoyaltyEvent } from "../../loyalty/messaging/send.js";
import { getInstagramChannel } from "../channels/metaChannel.service.js";
import { callMetaApi } from "../whatsapp/wa_axios.js";
import { sendInstagramTextMessage } from "./instagram_messaging.service.js";
import {
  awardInstagramMentionsOnJoin,
  handleInstagramMentionChange,
  linkPendingInstagramMentions,
  recordInstagramStoryMention,
} from "./instagram_mentions.service.js";

type Mock = ReturnType<typeof vi.fn>;
const ORG = "org-1";
const IBA = "iba-1";

const RULE = {
  id: "rule-1",
  status: "active",
  bonusPoints: 25,
  conditions: { trigger: "instagram_mention", mentionKinds: ["STORY", "MEDIA"], cooldownDays: 7 },
};

let seq = 0;
function installMentionTable() {
  const m = db.instagramMention;
  m.findUnique = vi.fn(async ({ where }: { where: Record<string, Record<string, unknown>> }) => {
    const key = where.orgId_kind_sourceId;
    return mentions.find((r) => matches(r, key)) ?? null;
  });
  m.create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    if (
      mentions.some((r) =>
        matches(r, { orgId: data.orgId, kind: data.kind, sourceId: data.sourceId }),
      )
    ) {
      throw Object.assign(new Error("unique"), { code: "P2002" });
    }
    const row: Row = {
      id: `m-${++seq}`,
      status: "PENDING",
      mediaId: null,
      permalink: null,
      igsId: null,
      username: null,
      contactId: null,
      points: null,
      transactionId: null,
      reason: null,
      createdAt: new Date(),
      resolvedAt: null,
      ...data,
    };
    mentions.push(row);
    return { ...row };
  });
  m.findFirst = vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
    return mentions.find((r) => matches(r, where)) ?? null;
  });
  m.findMany = vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
    mentions.filter((r) => matches(r, where)).map((r) => ({ ...r })),
  );
  m.updateMany = vi.fn(
    async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = mentions.filter((r) => matches(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    },
  );
  m.update = vi.fn(
    async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = mentions.find((r) => r.id === where.id)!;
      Object.assign(row, data);
      return { ...row };
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mentions.length = 0;
  installMentionTable();
  db.loyaltyProgram.findUnique.mockResolvedValue({ id: "prog-1", status: "active", name: "Cafe" });
  db.customerLoyaltyAccount.findUnique.mockResolvedValue({
    id: "acct-1",
    status: "active",
    contactId: "contact-1",
  });
  db.contact.findUnique.mockResolvedValue({
    id: "contact-1",
    whatsappUserName: "Anjali.K",
    name: "Anjali",
    identities: [{ kind: "IG_SCOPED", value: "igs-1" }],
  });
  db.contact.findFirst.mockResolvedValue({
    id: "contact-1",
    whatsappUserName: "Anjali.K",
    identities: [{ kind: "IG_SCOPED", value: "igs-1" }],
  });
  db.loyaltyEventTrigger.findUnique.mockResolvedValue(null);
  (findInstagramMentionRule as Mock).mockResolvedValue(RULE);
  (creditInstagramMention as Mock).mockImplementation(async () => ({
    replayed: false,
    transactionId: "tx-1",
    points: 25,
    balance: 125,
  }));
  (sendLoyaltyEvent as Mock).mockResolvedValue({ sent: true, skippedReason: null });
  (loadProgramForSend as Mock).mockResolvedValue({
    id: "prog-1",
    status: "active",
    whatsappNotifications: true,
    pointsActivityAlerts: true,
    sendTextInSession: false,
    enabledChannels: ["WHATSAPP"],
  });
  (getInstagramChannel as Mock).mockResolvedValue({ pageAccessToken: "page-token" });
  (callMetaApi as Mock).mockResolvedValue({
    data: { mentioned_media: { id: "media-1", username: "Anjali.K" } },
  });
});

describe("recordInstagramStoryMention", () => {
  const story = { orgId: ORG, ibaId: IBA, igsId: "igs-1", storyId: "mid-1" };

  test("awards a member and sends the reward message", async () => {
    await recordInstagramStoryMention(story);

    expect(creditInstagramMention).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acct-1",
        earningRuleId: "rule-1",
        points: 25,
        kind: "STORY",
        sourceId: "mid-1",
      }),
    );
    expect(mentions[0]).toMatchObject({
      status: "AWARDED",
      points: 25,
      transactionId: "tx-1",
      username: "anjali.k",
      contactId: "contact-1",
    });
    expect(sendLoyaltyEvent).toHaveBeenCalledWith(
      ORG,
      "INSTAGRAM_MENTION_REWARDED",
      { accountId: "acct-1" },
      { name: "Anjali", points: 25, balance: 125 },
    );
    expect(sendInstagramTextMessage).not.toHaveBeenCalled();
  });

  test("falls back to an Instagram DM when the member has no WhatsApp", async () => {
    (sendLoyaltyEvent as Mock).mockResolvedValue({ sent: false, skippedReason: "no_phone" });
    await recordInstagramStoryMention(story);

    expect(sendInstagramTextMessage).toHaveBeenCalledWith(
      "igs-1",
      "Thanks for the shout-out on Instagram, Anjali! You just earned 25 points. Your balance is now 125.",
      ORG,
      IBA,
    );
  });

  test("a redelivered story mention is a no-op", async () => {
    await recordInstagramStoryMention(story);
    await recordInstagramStoryMention(story);

    expect(mentions).toHaveLength(1);
    expect(creditInstagramMention).toHaveBeenCalledTimes(1);
    expect(sendLoyaltyEvent).toHaveBeenCalledTimes(1);
  });

  test("skips a member who earned for a mention inside the cooldown", async () => {
    mentions.push({
      id: "earlier",
      orgId: ORG,
      kind: "STORY",
      sourceId: "mid-0",
      status: "AWARDED",
      contactId: "contact-1",
      createdAt: new Date(Date.now() - 2 * 86_400_000),
      resolvedAt: new Date(Date.now() - 2 * 86_400_000),
    });
    await recordInstagramStoryMention(story);

    const row = mentions.find((r) => r.sourceId === "mid-1");
    expect(row).toMatchObject({ status: "SKIPPED", reason: "cooldown:7d" });
    expect(creditInstagramMention).not.toHaveBeenCalled();
  });

  test("invites a non-member to join and leaves the mention pending", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);
    await recordInstagramStoryMention(story);

    expect(mentions[0].status).toBe("PENDING");
    expect(creditInstagramMention).not.toHaveBeenCalled();
    const [igsId, text] = (sendInstagramTextMessage as Mock).mock.calls[0];
    expect(igsId).toBe("igs-1");
    expect(text).toContain("25 points");
    expect(text).toContain(`/loyalty/${ORG}/register?ig=${mentions[0].id}`);
  });

  test("skips a kind the rule does not cover", async () => {
    (findInstagramMentionRule as Mock).mockResolvedValue({
      ...RULE,
      conditions: { ...RULE.conditions, mentionKinds: ["MEDIA"] },
    });
    await recordInstagramStoryMention(story);

    expect(mentions[0]).toMatchObject({ status: "SKIPPED", reason: "no_rule" });
    expect(sendInstagramTextMessage).not.toHaveBeenCalled();
  });
});

describe("awardInstagramMentionsOnJoin", () => {
  test("pays the pending story mention once the customer joins through the link", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue(null);
    await recordInstagramStoryMention({ orgId: ORG, ibaId: IBA, igsId: "igs-1", storyId: "mid-1" });
    expect(mentions[0].status).toBe("PENDING");

    // The web form made a phone contact, not the Instagram one; the link ties them.
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({
      id: "acct-2",
      status: "active",
      contactId: "phone-contact",
    });
    const awarded = await awardInstagramMentionsOnJoin({
      orgId: ORG,
      contactId: "phone-contact",
      mentionId: mentions[0].id,
    });

    expect(awarded).toBe(1);
    expect(mentions[0]).toMatchObject({ status: "AWARDED", contactId: "phone-contact" });
    expect(creditInstagramMention).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "acct-2", sourceId: "mid-1" }),
    );
  });

  test("does not pay a mention older than 24 hours", async () => {
    mentions.push({
      id: "old",
      orgId: ORG,
      ibaId: IBA,
      kind: "STORY",
      sourceId: "mid-old",
      status: "PENDING",
      contactId: "contact-1",
      createdAt: new Date(Date.now() - 30 * 3_600_000),
    });
    await expect(
      awardInstagramMentionsOnJoin({ orgId: ORG, contactId: "contact-1" }),
    ).resolves.toBe(0);
    expect(creditInstagramMention).not.toHaveBeenCalled();
  });
});

describe("handleInstagramMentionChange", () => {
  test("resolves a caption mention by username and awards it", async () => {
    await handleInstagramMentionChange({ media_id: "media-1" }, { orgId: ORG, ibaId: IBA });

    expect(callMetaApi).toHaveBeenCalledWith(
      `/${IBA}`,
      "GET",
      "page-token",
      undefined,
      {},
      {},
      expect.objectContaining({
        fields: expect.stringContaining("mentioned_media.media_id(media-1)"),
      }),
    );
    expect(mentions[0]).toMatchObject({
      kind: "MEDIA",
      sourceId: "media-1",
      username: "anjali.k",
      status: "AWARDED",
    });
  });

  test("redelivery does not call Graph again", async () => {
    await handleInstagramMentionChange({ media_id: "media-1" }, { orgId: ORG, ibaId: IBA });
    await handleInstagramMentionChange({ media_id: "media-1" }, { orgId: ORG, ibaId: IBA });
    expect(callMetaApi).toHaveBeenCalledTimes(1);
    expect(creditInstagramMention).toHaveBeenCalledTimes(1);
  });

  test("keeps an unknown username pending, then links and awards it later", async () => {
    db.contact.findFirst.mockResolvedValueOnce(null);
    await handleInstagramMentionChange({ media_id: "media-1" }, { orgId: ORG, ibaId: IBA });
    expect(mentions[0]).toMatchObject({ status: "PENDING", contactId: null, username: "anjali.k" });

    await expect(linkPendingInstagramMentions(ORG, "contact-1", "@Anjali.K")).resolves.toBe(1);
    expect(mentions[0]).toMatchObject({
      status: "AWARDED",
      contactId: "contact-1",
      igsId: "igs-1",
    });
  });

  test("a Graph permission error records the mention without throwing", async () => {
    (callMetaApi as Mock).mockRejectedValue(new Error("(#10) permission"));
    await expect(
      handleInstagramMentionChange({ media_id: "media-1" }, { orgId: ORG, ibaId: IBA }),
    ).resolves.toBeUndefined();
    expect(mentions[0]).toMatchObject({ status: "PENDING", username: null });
  });
});
