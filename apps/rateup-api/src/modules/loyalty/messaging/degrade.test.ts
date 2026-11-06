import { describe, expect, test } from "vitest";

import { fitToChannel } from "./degrade.js";
import type { ChannelCapabilities, LoyaltyMessage } from "./types.js";

const textOnly: ChannelCapabilities = {
  maxTextLength: 160,
  replyButtons: null,
  list: null,
  image: false,
  ctaUrl: false,
  flow: false,
  proactiveNeedsTemplate: false,
};

describe("fitToChannel", () => {
  test("a list becomes numbered lines the customer can answer", () => {
    const fitted = fitToChannel(
      {
        key: "k",
        text: "Pick a reward",
        parts: {
          list: {
            button: "View",
            rows: [
              { id: "a", title: "Tea" },
              { id: "b", title: "Cake" },
            ],
          },
        },
      },
      textOnly,
    );

    expect(fitted).toEqual({
      key: "k",
      text: "Pick a reward\n\n1. Tea\n2. Cake\n\nReply with the number of your choice.",
      parts: undefined,
    });
  });

  test("buttons, a link and an image all fold into the text", () => {
    const fitted = fitToChannel(
      {
        key: "k",
        text: "Hi",
        parts: {
          buttons: [
            { id: "y", title: "Confirm" },
            { id: "n", title: "Cancel" },
          ],
          cta: { label: "Review us", url: "https://r" },
          image: { url: "https://c.png" },
        },
      },
      textOnly,
    );

    expect(fitted?.text).toBe(
      "Hi\n\nReply CONFIRM or CANCEL.\n\nReview us: https://r\n\nhttps://c.png",
    );
    expect(fitted?.parts).toBeUndefined();
  });

  test("a flow cannot be said in words, so the message cannot go", () => {
    const message: LoyaltyMessage = {
      key: "k",
      text: null,
      parts: { flow: { dbFlowId: "f", context: {} } },
    };
    expect(fitToChannel(message, textOnly)).toBeNull();
  });

  test("a channel that can show everything gets the message untouched", () => {
    const message: LoyaltyMessage = {
      key: "k",
      text: "Hi",
      parts: { buttons: [{ id: "y", title: "Yes" }] },
    };
    expect(
      fitToChannel(message, {
        ...textOnly,
        replyButtons: { max: 3, titleMax: 20 },
      }),
    ).toEqual(message);
  });
});
