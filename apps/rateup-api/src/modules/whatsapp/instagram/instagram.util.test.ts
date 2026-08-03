import { describe, expect, test } from "vitest";

import { InstagramEvent } from "../../../types/enums.js";
import { getInstagramWebhookEvent } from "./instagram.util.js";

/** One entry in the `messaging` array Meta posts to the Instagram webhook. */
function messaging(overrides: Record<string, unknown> = {}): any {
  return {
    sender: { id: "igs-1" },
    recipient: { id: "iba-1" },
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

describe("getInstagramWebhookEvent - the events it recognises", () => {
  test("classifies a plain text message as a message", () => {
    expect(getInstagramWebhookEvent(messaging({ message: { mid: "mid-1", text: "hi" } }))).toBe(
      InstagramEvent.MESSAGE,
    );
  });

  test("classifies a button tap as a postback", () => {
    expect(getInstagramWebhookEvent(messaging({ postback: { payload: "TRACK" } }))).toBe(
      InstagramEvent.POSTBACK,
    );
  });

  // A referral is its own event only when it arrived with nothing else — see the
  // "a referral that arrives with text" case below.
  test("classifies an ad or shop click with no message of its own as a referral", () => {
    const event = getInstagramWebhookEvent(
      messaging({ message: { mid: "mid-1", referral: { ref: "promo", source: "ADS" } } }),
    );

    expect(event).toBe(InstagramEvent.REFERRAL);
  });

  test("classifies a story mention by its attachment type", () => {
    const event = getInstagramWebhookEvent(
      messaging({
        message: {
          mid: "mid-1",
          attachments: [{ type: "story_mention", payload: { url: "https://cdn/story.jpg" } }],
        },
      }),
    );

    expect(event).toBe(InstagramEvent.STORY_MENTION);
  });

  test("classifies a reaction as a reaction", () => {
    const event = getInstagramWebhookEvent(
      messaging({ reaction: { mid: "mid-1", action: "react", emoji: "❤️" } }),
    );

    expect(event).toBe(InstagramEvent.MESSAGE_REACTION);
  });

  test("classifies a read receipt as a seen", () => {
    expect(getInstagramWebhookEvent(messaging({ read: { mid: "mid-1" } }))).toBe(
      InstagramEvent.MESSAGE_SEEN,
    );
  });

  test("treats a message with only ordinary attachments as a plain message", () => {
    const event = getInstagramWebhookEvent(
      messaging({
        message: { mid: "mid-1", attachments: [{ type: "image", payload: { url: "u" } }] },
      }),
    );

    expect(event).toBe(InstagramEvent.MESSAGE);
  });
});

describe("getInstagramWebhookEvent - what it declines to classify", () => {
  test("returns nothing for a messaging object with no recognisable payload", () => {
    expect(getInstagramWebhookEvent(messaging())).toBeNull();
  });

  // NOTE: pins current behaviour. The message branch runs before the reaction and
  // read branches and they sit in its `else`, so a message that also carries a
  // reaction or a read receipt is only ever classified as a message.
  test("a message beats a reaction on the same object", () => {
    const event = getInstagramWebhookEvent(
      messaging({ message: { mid: "mid-1", text: "hi" }, reaction: { mid: "mid-0" } }),
    );

    expect(event).toBe(InstagramEvent.MESSAGE);
  });

  // There was no is_echo branch here, unlike the Facebook equivalent. Echoes were
  // caught further down in handleInstagramMessages and
  // handleInstagramStoryMentionRule — but NOT in the reaction, postback or
  // referral handlers, so an echo carrying any of those was stored as if the
  // customer had sent it. Dropping them here gives every handler the guard.
  test("declines an echo of the business's own message", () => {
    const event = getInstagramWebhookEvent(
      messaging({ message: { mid: "mid-1", text: "hi", is_echo: true } }),
    );

    expect(event).toBeNull();
  });

  test("declines an echo even when it carries a postback", () => {
    const event = getInstagramWebhookEvent(
      messaging({ message: { mid: "mid-1", is_echo: true }, postback: { payload: "TRACK" } }),
    );

    expect(event).toBeNull();
  });

  // Unlike getFacebookWebhookEvent there was no try/catch, so a malformed entry
  // threw out of the classification step — and handleInstagramWebhook called this
  // inside its then-unguarded loop, taking the rest of the batch with it.
  test("reports nothing rather than throwing when handed nothing at all", () => {
    expect(getInstagramWebhookEvent(undefined as any)).toBeNull();
  });
});

describe("getInstagramWebhookEvent - which check wins when several could match", () => {
  test("a postback beats everything else on the same object", () => {
    const event = getInstagramWebhookEvent(
      messaging({ postback: { payload: "TRACK" }, message: { mid: "mid-1", text: "hi" } }),
    );

    expect(event).toBe(InstagramEvent.POSTBACK);
  });

  // A customer who taps a click-to-message ad and types in the same event sends
  // one event carrying both. The referral check used to come first, routing it to
  // handleInstagramReferral — which stores { type, referral, timestamp, sender }
  // and never looks at message.text — so the first message of a paid-acquisition
  // conversation reached the inbox as a bare referral marker. Classified as a
  // MESSAGE the whole object is stored, so the referral survives alongside the
  // text.
  test("a referral that arrives with text is a message, so the text survives", () => {
    const event = getInstagramWebhookEvent(
      messaging({
        message: { mid: "mid-1", text: "Is this still available?", referral: { ref: "promo" } },
      }),
    );

    expect(event).toBe(InstagramEvent.MESSAGE);
  });

  test("a referral that arrives with an attachment is also a message", () => {
    const event = getInstagramWebhookEvent(
      messaging({
        message: {
          mid: "mid-1",
          referral: { ref: "promo" },
          attachments: [{ type: "image", payload: { url: "u" } }],
        },
      }),
    );

    expect(event).toBe(InstagramEvent.MESSAGE);
  });

  test("a story mention beats the plain-message classification", () => {
    const event = getInstagramWebhookEvent(
      messaging({
        message: {
          mid: "mid-1",
          text: "love this",
          attachments: [
            { type: "image", payload: { url: "u" } },
            { type: "story_mention", payload: { url: "s" } },
          ],
        },
      }),
    );

    expect(event).toBe(InstagramEvent.STORY_MENTION);
  });
});
