import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { describe, expect, test } from "vitest";

import { InstagramEvent } from "../../../types/enums.js";
import { getInstagramWebhookEvent, resolveCommentTimestampMs } from "./instagram.util.js";

// Only for the expected values below — instagram.util.ts extends utc itself.
dayjs.extend(utc);

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

  test("classifies an ig.me link opening an existing thread as a referral", () => {
    const event = getInstagramWebhookEvent(
      messaging({ referral: { ref: "summer_sale", source: "SHORTLINKS", type: "OPEN_THREAD" } }),
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

describe("resolveCommentTimestampMs", () => {
  test("converts the comment's own seconds timestamp to milliseconds", () => {
    expect(resolveCommentTimestampMs(1_700_000_000, 1_785_917_090)).toBe(1_700_000_000_000);
  });

  test("falls back to the entry time when the comment carries none", () => {
    // The shape Meta actually posts: no created_time on the comment value.
    expect(resolveCommentTimestampMs(undefined, 1_785_917_090)).toBe(1_785_917_090_000);
  });

  test("leaves an entry time that is already in milliseconds alone", () => {
    expect(resolveCommentTimestampMs(undefined, 1_785_917_090_000)).toBe(1_785_917_090_000);
  });

  test("falls back to now when neither time is usable", () => {
    const before = Date.now();
    const resolved = resolveCommentTimestampMs(undefined, undefined);

    expect(resolved).toBeGreaterThanOrEqual(before);
    expect(resolved).toBeLessThanOrEqual(Date.now());
  });

  test("ignores a non-finite or non-positive time rather than producing an invalid date", () => {
    expect(resolveCommentTimestampMs(NaN, 1_785_917_090)).toBe(1_785_917_090_000);
    expect(resolveCommentTimestampMs(0, 1_785_917_090)).toBe(1_785_917_090_000);
  });

  // Graph API reads (as opposed to webhook deliveries) return created_time as an
  // ISO string, which is why dayjs parses rather than arithmetic on a number.
  test("parses the ISO created_time a Graph API read returns", () => {
    expect(resolveCommentTimestampMs("2026-08-05T13:34:50+0000")).toBe(
      dayjs.utc("2026-08-05T13:34:50Z").valueOf(),
    );
  });

  test("reads a numeric string as an epoch, not a year", () => {
    expect(resolveCommentTimestampMs("1785917090")).toBe(1_785_917_090_000);
  });

  test("skips a string that is not a date at all", () => {
    expect(resolveCommentTimestampMs("not-a-date", 1_785_917_090)).toBe(1_785_917_090_000);
    expect(resolveCommentTimestampMs("", 1_785_917_090)).toBe(1_785_917_090_000);
  });
});
