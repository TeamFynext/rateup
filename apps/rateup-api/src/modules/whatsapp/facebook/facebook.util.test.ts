import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { FacebookEvent } from "../../../types/enums.js";
import { getFacebookWebhookEvent } from "./facebook.util.js";

/** One entry in the `messaging` array Meta posts to the page webhook. */
function messaging(overrides: Record<string, unknown> = {}): any {
  return {
    sender: { id: "psid-1" },
    recipient: { id: "page-1" },
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFacebookWebhookEvent - the events it recognises", () => {
  test("classifies a plain text message as a message", () => {
    const event = getFacebookWebhookEvent(messaging({ message: { mid: "mid-1", text: "hello" } }));

    expect(event).toBe(FacebookEvent.MESSAGE);
  });

  test("classifies a message carrying a quick reply payload as a quick reply", () => {
    const event = getFacebookWebhookEvent(
      messaging({
        message: { mid: "mid-1", text: "Yes", quick_reply: { payload: "CONFIRM" } },
      }),
    );

    expect(event).toBe(FacebookEvent.QUICK_REPLY);
  });

  test("classifies a delivery receipt as a delivery", () => {
    const event = getFacebookWebhookEvent(
      messaging({ delivery: { mids: ["mid-1"], watermark: 1_700_000_000_000 } }),
    );

    expect(event).toBe(FacebookEvent.MESSAGE_DELIVERED);
  });

  test("classifies a read receipt as a read", () => {
    const event = getFacebookWebhookEvent(messaging({ read: { watermark: 1_700_000_000_000 } }));

    expect(event).toBe(FacebookEvent.MESSAGE_READ);
  });

  test("classifies a button tap as a postback", () => {
    const event = getFacebookWebhookEvent(
      messaging({ postback: { title: "Track order", payload: "TRACK" } }),
    );

    expect(event).toBe(FacebookEvent.POSTBACK);
  });
});

describe("getFacebookWebhookEvent - what it declines to classify", () => {
  test("skips an echo of a message the page itself sent", () => {
    const event = getFacebookWebhookEvent(
      messaging({ message: { mid: "mid-1", text: "hello", is_echo: true } }),
    );

    expect(event).toBeNull();
  });

  test("skips an echo even when it carries a quick reply", () => {
    const event = getFacebookWebhookEvent(
      messaging({
        message: { mid: "mid-1", is_echo: true, quick_reply: { payload: "CONFIRM" } },
      }),
    );

    expect(event).toBeNull();
  });

  test("returns nothing for a messaging object with no recognisable payload", () => {
    expect(getFacebookWebhookEvent(messaging())).toBeNull();
  });

  test("returns nothing rather than throwing when handed nothing at all", () => {
    expect(getFacebookWebhookEvent(undefined as any)).toBeNull();
  });

  // Reactions now classify, as they already did on Instagram — without this branch a
  // customer reacting to a message left no trace in the inbox, and the same gesture
  // behaved differently on the two platforms.
  test("classifies a message reaction", () => {
    const event = getFacebookWebhookEvent(
      messaging({ reaction: { mid: "mid-1", action: "react", emoji: "❤️" } }),
    );

    expect(event).toBe(FacebookEvent.MESSAGE_REACTION);
  });

  test("never reports an opt-in, even though the enum has one", () => {
    const event = getFacebookWebhookEvent(messaging({ optin: { ref: "promo" } }));

    expect(event).toBeNull();
    expect(event).not.toBe(FacebookEvent.OPT_IN);
  });
});

describe("getFacebookWebhookEvent - which check wins when several could match", () => {
  test("a quick reply beats the plain-message classification", () => {
    const event = getFacebookWebhookEvent(
      messaging({ message: { mid: "mid-1", quick_reply: { payload: "P" } } }),
    );

    expect(event).toBe(FacebookEvent.QUICK_REPLY);
  });

  test("a delivery receipt beats a message on the same object", () => {
    const event = getFacebookWebhookEvent(
      messaging({ message: { mid: "mid-1" }, delivery: { mids: ["mid-1"], watermark: 1 } }),
    );

    expect(event).toBe(FacebookEvent.MESSAGE_DELIVERED);
  });

  // The postback check sits ABOVE the general message check now: below it, a payload
  // carrying both classified as a plain MESSAGE and the postback payload was lost.
  test("a postback wins over a message on the same object, keeping the payload", () => {
    const event = getFacebookWebhookEvent(
      messaging({ message: { mid: "mid-1", text: "hi" }, postback: { payload: "TRACK" } }),
    );

    expect(event).toBe(FacebookEvent.POSTBACK);
  });
});
