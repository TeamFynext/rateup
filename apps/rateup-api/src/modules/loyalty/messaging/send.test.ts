import { beforeEach, describe, expect, test, vi } from "vitest";

import type { LoyaltyChannel } from "./types.js";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyProgram: { findUnique: vi.fn() },
    loyaltyEventTrigger: { findUnique: vi.fn() },
    loyaltyWaCommand: { findFirst: vi.fn() },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("./recipient.js", () => ({ resolveRecipient: vi.fn() }));

const channels = vi.hoisted(() => ({}) as Record<string, LoyaltyChannel>);
vi.mock("./registry.js", () => ({ getLoyaltyChannel: (id: string) => channels[id] }));

import prisma from "../../../utils/prisma.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import { resolveRecipient } from "./recipient.js";
import { sendLoyalty, sendLoyaltyEvent } from "./send.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;

const ORG = "11111111-1111-4111-8111-111111111111";

function fakeChannel(id: "WHATSAPP" | "SMS", over: Partial<LoyaltyChannel> = {}): LoyaltyChannel {
  return {
    id,
    capabilities: {
      maxTextLength: 1000,
      replyButtons: { max: 3, titleMax: 20 },
      list: { maxRows: 10, titleMax: 24 },
      image: true,
      ctaUrl: true,
      flow: true,
      proactiveNeedsTemplate: false,
    },
    isReachable: vi.fn(() => true as const),
    plan: vi.fn(async (_ctx, message) => ({
      ok: true as const,
      mode: "text" as const,
      text: message.text,
      templateId: null,
      detail: null,
    })),
    send: vi.fn(async () => ({ ok: true, messageId: `${id}-1` })),
    ...over,
  };
}

function program(over: Record<string, unknown> = {}) {
  return {
    id: "prog-1",
    status: "active",
    whatsappNotifications: true,
    pointsActivityAlerts: true,
    sendTextInSession: true,
    enabledChannels: ["WHATSAPP", "SMS"],
    ...over,
  };
}

const member = {
  orgId: ORG,
  contactId: "c1",
  accountId: "a1",
  name: "Ann",
  phone: "919000000001",
  email: null,
  preferredChannel: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(channels)) delete channels[key];
  channels.WHATSAPP = fakeChannel("WHATSAPP");
  channels.SMS = fakeChannel("SMS");
  (resolveRecipient as Mock).mockResolvedValue(member);
  db.loyaltyProgram.findUnique.mockResolvedValue(program());
  db.loyaltyEventTrigger.findUnique.mockResolvedValue({
    enabled: true,
    body: "Hi {{1}}, +{{2}} points, now {{3}}.",
    waTemplateId: null,
  });
  db.loyaltyWaCommand.findFirst.mockResolvedValue(null);
});

const message = { key: "k", text: "Hello" };

describe("sendLoyalty — choosing the channel", () => {
  test("goes to the member's own channel first", async () => {
    (resolveRecipient as Mock).mockResolvedValue({ ...member, preferredChannel: "SMS" });

    const outcome = await sendLoyalty({
      orgId: ORG,
      to: { accountId: "a1" },
      message,
      intent: { kind: "notify" },
    });

    expect(outcome).toMatchObject({ sent: true, channel: "sms", mode: "text", text: "Hello" });
    expect(channels.WHATSAPP.plan).not.toHaveBeenCalled();
  });

  test("falls back to the next channel when one cannot carry the message", async () => {
    channels.WHATSAPP.plan = vi.fn(async () => ({
      ok: false as const,
      reason: "no_template" as const,
      text: "Hello",
      templateId: null,
    }));

    const outcome = await sendLoyalty({
      orgId: ORG,
      to: { accountId: "a1" },
      message,
      intent: { kind: "notify" },
    });

    expect(outcome).toMatchObject({ sent: true, channel: "sms", messageId: "SMS-1" });
  });

  test("skips a channel the member has no address on", async () => {
    channels.WHATSAPP.isReachable = vi.fn(() => "no_phone" as const);

    const outcome = await sendLoyalty({
      orgId: ORG,
      to: { accountId: "a1" },
      message,
      intent: { kind: "notify" },
    });

    expect(outcome.channel).toBe("sms");
  });

  test("never falls back after a send failed: it may have been delivered", async () => {
    channels.WHATSAPP.send = vi.fn(async () => ({ ok: false, error: "timeout" }));

    const outcome = await sendLoyalty({
      orgId: ORG,
      to: { accountId: "a1" },
      message,
      intent: { kind: "notify" },
    });

    expect(outcome).toMatchObject({
      sent: false,
      channel: "whatsapp",
      skippedReason: "send_failed",
      error: "timeout",
    });
    expect(channels.SMS.plan).not.toHaveBeenCalled();
  });

  test("when nothing can carry it, reports why the first channel could not", async () => {
    for (const channel of Object.values(channels)) {
      channel.plan = vi.fn(async () => ({
        ok: false as const,
        reason: "template_not_approved" as const,
        text: "Hello",
        templateId: "t1",
      }));
    }

    const outcome = await sendLoyalty({
      orgId: ORG,
      to: { accountId: "a1" },
      message,
      intent: { kind: "notify" },
    });

    expect(outcome).toMatchObject({
      sent: false,
      channel: "whatsapp",
      skippedReason: "template_not_approved",
      templateId: "t1",
    });
  });

  test("a reply answers on the channel it came in on, not the member's preference", async () => {
    (resolveRecipient as Mock).mockResolvedValue({ ...member, preferredChannel: "SMS" });

    const outcome = await sendLoyalty({
      orgId: ORG,
      to: { phone: "919000000001" },
      message,
      intent: { kind: "reply", channel: "WHATSAPP", phoneId: "p1" },
    });

    expect(outcome.channel).toBe("whatsapp");
    expect((channels.WHATSAPP.plan as Mock).mock.calls[0][0]).toMatchObject({
      reply: { phoneId: "p1" },
      program: null,
    });
    expect(db.loyaltyProgram.findUnique).not.toHaveBeenCalled();
  });

  test("a message a channel cannot show at all is not offered to it", async () => {
    channels.WHATSAPP.capabilities = { ...channels.WHATSAPP.capabilities, flow: false };

    const outcome = await sendLoyalty({
      orgId: ORG,
      to: { accountId: "a1" },
      message: { key: "f", text: null, parts: { flow: { dbFlowId: "x", context: {} } } },
      intent: { kind: "notify" },
    });

    expect(channels.WHATSAPP.plan).not.toHaveBeenCalled();
    expect(outcome.channel).toBe("sms");
  });
});

describe("sendLoyaltyEvent — the programme's switches", () => {
  const send = () =>
    sendLoyaltyEvent(
      ORG,
      LoyaltyEventType.POINTS_ISSUED,
      { accountId: "a1" },
      { points: 43, balance: 100 },
    );

  test.each([
    [null, "no_program"],
    [program({ status: "paused" }), "program_inactive"],
    [program({ whatsappNotifications: false }), "whatsapp_disabled"],
    [program({ pointsActivityAlerts: false }), "points_alerts_disabled"],
  ])("stops at the first switch that is off (%#)", async (row, reason) => {
    db.loyaltyProgram.findUnique.mockResolvedValue(row);

    expect(await send()).toMatchObject({ sent: false, skippedReason: reason });
    expect(channels.WHATSAPP.plan).not.toHaveBeenCalled();
  });

  test("the points-alert switch leaves other events alone", async () => {
    db.loyaltyProgram.findUnique.mockResolvedValue(program({ pointsActivityAlerts: false }));

    const outcome = await sendLoyaltyEvent(
      ORG,
      LoyaltyEventType.TIER_UPGRADED,
      { accountId: "a1" },
      { tier: "Gold" },
    );

    expect(outcome.sent).toBe(true);
  });

  test("a failure inside is reported, never thrown at the caller", async () => {
    db.loyaltyProgram.findUnique.mockRejectedValue(new Error("db down"));

    expect(await send()).toMatchObject({ sent: false, skippedReason: "send_failed" });
  });
});

describe("sendLoyaltyEvent — the words", () => {
  test("fills the event's own words, the member's name first", async () => {
    await sendLoyaltyEvent(
      ORG,
      LoyaltyEventType.POINTS_ISSUED,
      { accountId: "a1" },
      { points: 43, balance: 100 },
    );

    const sent = (channels.WHATSAPP.plan as Mock).mock.calls[0][1];
    expect(sent).toEqual({ key: "event:POINTS_ISSUED", text: "Hi Ann, +43 points, now 100." });
  });

  test("with no words of its own, the event uses the catalog's", async () => {
    db.loyaltyEventTrigger.findUnique.mockResolvedValue({
      enabled: true,
      body: null,
      waTemplateId: null,
    });

    await sendLoyaltyEvent(
      ORG,
      LoyaltyEventType.POINTS_ISSUED,
      { accountId: "a1" },
      { name: "Bo", points: 1, balance: 2 },
    );

    expect((channels.WHATSAPP.plan as Mock).mock.calls[0][1].text).toBe(
      "Hi Bo, you just earned 1 points. Your balance is now 2.",
    );
  });

  test("carries the template for the channels that need one", async () => {
    db.loyaltyEventTrigger.findUnique.mockResolvedValue({
      enabled: true,
      body: null,
      waTemplateId: "tmpl-1",
    });

    await sendLoyaltyEvent(
      ORG,
      LoyaltyEventType.POINTS_ISSUED,
      { accountId: "a1" },
      { points: 43, balance: 100 },
    );

    expect((channels.WHATSAPP.plan as Mock).mock.calls[0][1].artefacts).toEqual({
      WHATSAPP: { waTemplateId: "tmpl-1", params: ["Ann", "43", "100"] },
    });
  });

  test("a message switched off stays off, but a reward's own template still speaks", async () => {
    db.loyaltyEventTrigger.findUnique.mockResolvedValue({
      enabled: false,
      body: "x",
      waTemplateId: "t",
    });

    expect(
      await sendLoyaltyEvent(ORG, LoyaltyEventType.REWARD_ISSUED, { accountId: "a1" }, {}),
    ).toMatchObject({ sent: false, skippedReason: "no_template" });

    await sendLoyaltyEvent(
      ORG,
      LoyaltyEventType.REWARD_ISSUED,
      { accountId: "a1" },
      { rewardName: "Tea", code: "RU-1" },
      { rewardWaTemplateId: "reward-tmpl" },
    );
    expect((channels.WHATSAPP.plan as Mock).mock.calls[0][1]).toMatchObject({
      text: null,
      artefacts: { WHATSAPP: { waTemplateId: "reward-tmpl", params: ["Ann", "Tea", "RU-1", ""] } },
    });
  });

  test("an event never set up says nothing", async () => {
    db.loyaltyEventTrigger.findUnique.mockResolvedValue(null);

    expect(
      await sendLoyaltyEvent(ORG, LoyaltyEventType.BIRTHDAY, { accountId: "a1" }, {}),
    ).toMatchObject({
      skippedReason: "no_template",
    });
  });

  test("the welcome carries a Join button labelled with the join keyword", async () => {
    db.loyaltyEventTrigger.findUnique.mockResolvedValue({
      enabled: true,
      body: null,
      waTemplateId: "tmpl-w",
    });
    db.loyaltyWaCommand.findFirst.mockResolvedValue({ requestMessage: "signup" });

    await sendLoyaltyEvent(
      ORG,
      LoyaltyEventType.NEW_CUSTOMER_WELCOME,
      { contactId: "c1" },
      { name: "there" },
    );

    expect((channels.WHATSAPP.plan as Mock).mock.calls[0][1]).toMatchObject({
      parts: { buttons: [{ id: "LOYALTY_JOIN", title: "Signup" }] },
      artefacts: { WHATSAPP: { waTemplateId: "tmpl-w", quickReplyPayload: ["LOYALTY_JOIN"] } },
    });
  });
});
