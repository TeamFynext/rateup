import { describe, expect, it } from "vitest";

import { MessagePlatform } from "@/types/enums.ts";

import { contactMessagingWindow, messagingWindow, timeLeft } from "./messagingWindow.ts";

const NOW = new Date("2026-11-04T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const hoursAhead = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

describe("messagingWindow", () => {
  it("is open for 24 h, then needs a person until 7 days, then closes", () => {
    expect(messagingWindow({ lastInboundAt: hoursAgo(23), now: NOW }).state).toBe("open");
    expect(messagingWindow({ lastInboundAt: hoursAgo(24), now: NOW }).state).toBe("human_agent");
    expect(messagingWindow({ lastInboundAt: hoursAgo(167), now: NOW }).state).toBe("human_agent");
    expect(messagingWindow({ lastInboundAt: hoursAgo(168), now: NOW }).state).toBe("closed");
  });

  it("is closed when the customer never wrote", () => {
    expect(messagingWindow({ lastInboundAt: null, now: NOW })).toEqual({
      state: "closed",
      openUntil: null,
      closesAt: null,
    });
  });

  it("treats a live ad thread as open", () => {
    const window = messagingWindow({
      lastInboundAt: hoursAgo(200),
      adThreadUntil: hoursAhead(3),
      now: NOW,
    });
    expect(window.state).toBe("open");
    expect(window.closesAt?.toISOString()).toBe(hoursAhead(3));
  });
});

describe("contactMessagingWindow", () => {
  it("applies to Instagram and Messenger only", () => {
    const contact = { lastReceivedMessageTimeStamp: hoursAgo(30) };
    expect(contactMessagingWindow(contact, MessagePlatform.INSTAGRAM, NOW)?.state).toBe(
      "human_agent",
    );
    expect(contactMessagingWindow(contact, MessagePlatform.FACEBOOK, NOW)?.state).toBe(
      "human_agent",
    );
    expect(contactMessagingWindow(contact, MessagePlatform.WHATSAPP, NOW)).toBeNull();
  });
});

describe("timeLeft", () => {
  it("splits into days and hours, never negative", () => {
    expect(timeLeft(new Date(hoursAhead(3 * 24 + 5)), NOW)).toEqual({ days: 3, hours: 5 });
    expect(timeLeft(new Date(hoursAgo(1)), NOW)).toEqual({ days: 0, hours: 0 });
  });
});
