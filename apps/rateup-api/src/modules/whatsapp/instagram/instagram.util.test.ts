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

  test("classifies an ad or shop click as a referral", () => {
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

  // NOTE: pins current behaviour. There is no is_echo branch here, unlike the
  // Facebook equivalent. Echoes are caught further down in handleInstagramMessages
  // and handleInstagramStoryMentionRule — but NOT in the reaction, postback or
  // referral handlers, so an echo carrying any of those is stored as if the
  // customer had sent it. See issues.txt 12.6.
  test("classifies an echo of the business's own message as a message", () => {
    const event = getInstagramWebhookEvent(
      messaging({ message: { mid: "mid-1", text: "hi", is_echo: true } }),
    );

    expect(event).toBe(InstagramEvent.MESSAGE);
  });

  // NOTE: pins current behaviour. Unlike getFacebookWebhookEvent, there is no
  // try/catch, so a malformed entry throws out of the classification step — and
  // handleInstagramWebhook calls this inside its unguarded loop, so the throw takes
  // the rest of the batch with it. See issues.txt 12.2.
  test("throws rather than returning nothing when handed nothing at all", () => {
    expect(() => getInstagramWebhookEvent(undefined as any)).toThrow(TypeError);
  });
});

describe("getInstagramWebhookEvent - which check wins when several could match", () => {
  test("a postback beats everything else on the same object", () => {
    const event = getInstagramWebhookEvent(
      messaging({ postback: { payload: "TRACK" }, message: { mid: "mid-1", text: "hi" } }),
    );

    expect(event).toBe(InstagramEvent.POSTBACK);
  });

  // NOTE: pins current behaviour. A customer who taps an ad and types a message
  // sends one event carrying both. The referral check comes first, so it is routed
  // to handleInstagramReferral — which stores { type, referral, timestamp, sender }
  // and never looks at message.text. The customer's actual words are dropped from
  // the inbox and from the automated-reply match. See issues.txt 12.5.
  test("a referral beats the message it arrived with, so the text is lost", () => {
    const event = getInstagramWebhookEvent(
      messaging({
        message: { mid: "mid-1", text: "Is this still available?", referral: { ref: "promo" } },
      }),
    );

    expect(event).toBe(InstagramEvent.REFERRAL);
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
