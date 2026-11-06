import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const contactFindFirst = vi.fn();
const waMessageFindFirst = vi.fn();
const conversationFindFirst = vi.fn();

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findFirst: contactFindFirst },
    waMessage: { findFirst: waMessageFindFirst },
    conversation: { findFirst: conversationFindFirst },
  },
}));

const { PlatformType } = await import("../../../generated/prisma/enums.js");
const {
  gateSendApiMessage,
  isHumanInboxSend,
  isOutsideWindowError,
  messagingWindow,
  MetaSendRefusedError,
  sendWindowFields,
} = await import("./sendWindow.js");

const NOW = new Date("2026-11-04T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);
const hoursAhead = (h: number) => new Date(NOW.getTime() + h * 60 * 60 * 1000);

describe("messagingWindow", () => {
  it("is open inside 24 h of the customer's last message", () => {
    const window = messagingWindow({ lastInboundAt: hoursAgo(23), now: NOW });
    expect(window.state).toBe("open");
    expect(window.openUntil).toEqual(hoursAhead(1));
    expect(window.closesAt).toEqual(hoursAhead(7 * 24 - 23));
    expect(sendWindowFields(window)).toEqual({ messaging_type: "RESPONSE" });
  });

  it("needs the Human Agent tag from 24 h to 7 days", () => {
    for (const age of [24, 25, 7 * 24 - 1]) {
      const window = messagingWindow({ lastInboundAt: hoursAgo(age), now: NOW });
      expect(window.state).toBe("human_agent");
      expect(sendWindowFields(window)).toEqual({
        messaging_type: "MESSAGE_TAG",
        tag: "HUMAN_AGENT",
      });
    }
  });

  it("is closed at 7 days, and when the customer never wrote", () => {
    expect(messagingWindow({ lastInboundAt: hoursAgo(7 * 24), now: NOW }).state).toBe("closed");
    const never = messagingWindow({ lastInboundAt: null, now: NOW });
    expect(never).toEqual({ state: "closed", openUntil: null, closesAt: null });
    expect(sendWindowFields(never)).toBeNull();
  });

  it("keeps an ad thread open (RESPONSE) until adThreadUntil", () => {
    const window = messagingWindow({
      lastInboundAt: hoursAgo(10 * 24),
      adThreadUntil: hoursAhead(5),
      now: NOW,
    });
    expect(window.state).toBe("open");
    expect(window.openUntil).toEqual(hoursAhead(5));
    expect(window.closesAt).toEqual(hoursAhead(5));
  });

  it("ignores an ad window that has passed", () => {
    const window = messagingWindow({
      lastInboundAt: hoursAgo(30),
      adThreadUntil: hoursAgo(1),
      now: NOW,
    });
    expect(window.state).toBe("human_agent");
  });
});

describe("isHumanInboxSend", () => {
  const human = { platform: PlatformType.INSTAGRAM, messageType: "INBOX", userId: "u1" };

  it("is a person replying from the inbox on Instagram or Messenger", () => {
    expect(isHumanInboxSend(human)).toBe(true);
    expect(isHumanInboxSend({ ...human, platform: PlatformType.FACEBOOK })).toBe(true);
  });

  it("never tags automations, other message types or other channels", () => {
    expect(isHumanInboxSend({ ...human, isAutomated: true })).toBe(false);
    expect(isHumanInboxSend({ ...human, userId: undefined })).toBe(false);
    expect(isHumanInboxSend({ ...human, messageType: "AUTOMATED" })).toBe(false);
    expect(isHumanInboxSend({ ...human, messageType: "FLOW" })).toBe(false);
    expect(isHumanInboxSend({ ...human, platform: PlatformType.WHATSAPP })).toBe(false);
  });
});

describe("isOutsideWindowError", () => {
  it("knows Messenger's and Instagram's codes", () => {
    expect(isOutsideWindowError({ code: 10, error_subcode: 2018278 })).toBe(true);
    expect(isOutsideWindowError({ code: 10, error_subcode: 2534022 })).toBe(true);
    expect(isOutsideWindowError({ code: 10, error_subcode: 1 })).toBe(false);
    expect(isOutsideWindowError(undefined)).toBe(false);
  });
});

describe("gateSendApiMessage", () => {
  const payload = { recipient: { id: "igsid-1" }, message: { text: "hi" } };
  const contact = { id: "c1", igBlockedAt: null, lastReceivedMessageTimeStamp: null };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    contactFindFirst.mockResolvedValue(contact);
    conversationFindFirst.mockResolvedValue(null);
  });
  afterEach(() => vi.useRealTimers());

  const humanSend = (extra: Record<string, unknown> = {}) =>
    gateSendApiMessage({
      orgId: "org-1",
      platform: PlatformType.INSTAGRAM,
      to: "igsid-1",
      payload,
      messageType: "INBOX",
      userId: "u1",
      ...extra,
    });

  it("tags a human reply after 24 h", async () => {
    waMessageFindFirst.mockResolvedValue({ waCreatedAt: hoursAgo(48), createdAt: hoursAgo(48) });
    await expect(humanSend()).resolves.toEqual({
      ...payload,
      messaging_type: "MESSAGE_TAG",
      tag: "HUMAN_AGENT",
    });
  });

  it("refuses a human reply after 7 days", async () => {
    waMessageFindFirst.mockResolvedValue({ waCreatedAt: hoursAgo(8 * 24), createdAt: null });
    await expect(humanSend()).rejects.toBeInstanceOf(MetaSendRefusedError);
  });

  it("falls back to the contact's last-received time", async () => {
    waMessageFindFirst.mockResolvedValue(null);
    contactFindFirst.mockResolvedValue({ ...contact, lastReceivedMessageTimeStamp: hoursAgo(2) });
    await expect(humanSend()).resolves.toMatchObject({ messaging_type: "RESPONSE" });
  });

  it("leaves an automated send untouched, without reading the window", async () => {
    const result = await humanSend({
      messageType: "AUTOMATED",
      isAutomated: true,
      userId: undefined,
    });
    expect(result).toBe(payload);
    expect(waMessageFindFirst).not.toHaveBeenCalled();
  });

  it("refuses a reply to someone blocked on Instagram", async () => {
    contactFindFirst.mockResolvedValue({ ...contact, igBlockedAt: hoursAgo(1) });
    await expect(humanSend()).rejects.toMatchObject({ reason: "ig_blocked", statusCode: 422 });
  });

  it("leaves automations to a blocked person for Meta to refuse", async () => {
    contactFindFirst.mockResolvedValue({ ...contact, igBlockedAt: hoursAgo(1) });
    await expect(humanSend({ isAutomated: true })).resolves.toBe(payload);
    expect(contactFindFirst).not.toHaveBeenCalled();
  });

  it("does not tag a sender action", async () => {
    const reaction = { recipient: { id: "igsid-1" }, sender_action: "react" };
    await expect(humanSend({ payload: reaction })).resolves.toBe(reaction);
    expect(waMessageFindFirst).not.toHaveBeenCalled();
  });

  it("passes WhatsApp through without a query", async () => {
    const wa = { to: "+1" };
    await expect(humanSend({ platform: PlatformType.WHATSAPP, payload: wa })).resolves.toBe(wa);
    expect(contactFindFirst).not.toHaveBeenCalled();
  });
});
