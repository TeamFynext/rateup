import { describe, expect, test, vi } from "vitest";

// Hoisted above the imports by vitest; the real module pulls in React Native.
vi.mock("@/constants/enums", () => ({
  MessagePlatform: { WHATSAPP: "WHATSAPP", INSTAGRAM: "INSTAGRAM", FACEBOOK: "FACEBOOK" },
}));

import { contactMessagingWindow, messagingWindow, messagingWindowLabel } from "./messagingWindow";

const NOW = new Date("2026-11-04T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe("messagingWindow", () => {
  test("open for 24 h, a person's for 7 days, then closed", () => {
    expect(messagingWindow({ lastInboundAt: hoursAgo(1), now: NOW }).state).toBe("open");
    expect(messagingWindow({ lastInboundAt: hoursAgo(30), now: NOW }).state).toBe("human_agent");
    expect(messagingWindow({ lastInboundAt: hoursAgo(169), now: NOW }).state).toBe("closed");
    expect(messagingWindow({ lastInboundAt: null, now: NOW }).state).toBe("closed");
  });

  test("an ad thread stays open until it ends", () => {
    const until = new Date(NOW.getTime() + 3_600_000).toISOString();
    expect(
      messagingWindow({ lastInboundAt: hoursAgo(200), adThreadUntil: until, now: NOW }).state,
    ).toBe("open");
  });

  test("applies to Instagram and Messenger only", () => {
    const contact = { lastReceivedMessageTimeStamp: hoursAgo(30) };
    expect(contactMessagingWindow(contact, "INSTAGRAM", NOW)?.state).toBe("human_agent");
    expect(contactMessagingWindow(contact, "WHATSAPP", NOW)).toBeNull();
  });

  test("labels the time left", () => {
    const window = messagingWindow({ lastInboundAt: hoursAgo(30), now: NOW });
    expect(messagingWindowLabel(window, NOW)).toBe(
      "Window closes in 5d 18h · only a person can reply",
    );
    expect(messagingWindowLabel(messagingWindow({ lastInboundAt: null, now: NOW }), NOW)).toBe(
      "Reply window closed",
    );
  });
});
