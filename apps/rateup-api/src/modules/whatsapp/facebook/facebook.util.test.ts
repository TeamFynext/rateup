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

  // NOTE: pins current behaviour. Facebook message reactions are declared on
  // FacebookWebhookBody and Meta does deliver them, but there is no branch for
  // them here, so every reaction is silently dropped. The Instagram equivalent
  // (getInstagramWebhookEvent) DOES return MESSAGE_REACTION. See issues.txt 10.1.
  test("drops a message reaction instead of classifying it", () => {
    const event = getFacebookWebhookEvent(
      messaging({ reaction: { mid: "mid-1", action: "react", emoji: "❤️" } }),
    );

    expect(event).toBeNull();
  });

  // NOTE: pins current behaviour. FacebookEvent.OPT_IN exists in the enum and is
  // never produced by anything, so an opt-in event is dropped. See issues.txt 10.5.
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

  // NOTE: pins current behaviour. The postback check sits below the general
  // message check, so a payload carrying both loses the postback. See issues.txt 10.5.
  test("a message beats a postback on the same object, losing the payload", () => {
    const event = getFacebookWebhookEvent(
      messaging({ message: { mid: "mid-1", text: "hi" }, postback: { payload: "TRACK" } }),
    );

    expect(event).toBe(FacebookEvent.MESSAGE);
  });
});
