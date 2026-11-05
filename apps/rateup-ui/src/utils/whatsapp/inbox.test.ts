import { describe, expect, it } from "vitest";

import { MessagePlatform } from "@/types/enums.ts";

import {
  compareInboxRowTimes,
  getContactChannelSource,
  getContactDisplayPhone,
  getContactLabel,
  getContactWaAddress,
  getMessagePreview,
  getReplyToMid,
  inboxRowSortTime,
  isMetaAiMessage,
  parseWaMessage,
  returnMessageContentBasedOnParsedMessage,
} from "./inbox.ts";

describe("getContactChannelSource", () => {
  it("reads platform and account off the same message", () => {
    expect(
      getContactChannelSource({
        lastMessage: { sourcePlatform: MessagePlatform.WHATSAPP, sourceIdentifier: "+15551230000" },
      }),
    ).toEqual({ platform: MessagePlatform.WHATSAPP, identifier: "+15551230000" });
  });

  it("skips an internal note and falls through to the last real channel message", () => {
    expect(
      getContactChannelSource({
        lastMessage: { sourcePlatform: "INTERNAL", sourceIdentifier: "internal" },
        messages: [
          { sourcePlatform: "INTERNAL", sourceIdentifier: "internal" },
          { sourcePlatform: MessagePlatform.INSTAGRAM, sourceIdentifier: "iba-1" },
          { sourcePlatform: MessagePlatform.WHATSAPP, sourceIdentifier: "+15551230000" },
        ],
      }),
    ).toEqual({ platform: MessagePlatform.INSTAGRAM, identifier: "iba-1" });
  });

  it("guesses the platform from the contact's identity, and claims no account for it", () => {
    expect(getContactChannelSource({ psid: "psid-1" })).toEqual({
      platform: MessagePlatform.FACEBOOK,
      identifier: null,
    });
    expect(getContactChannelSource(null)).toEqual({
      platform: MessagePlatform.WHATSAPP,
      identifier: null,
    });
  });
});

describe("getContactDisplayPhone", () => {
  it("prefers the contact's own number", () => {
    expect(getContactDisplayPhone({ phone: "+15551230000", other: "ignored" })).toBe(
      "+15551230000",
    );
  });

  it("falls back to `other` for a webchat visitor, who has no `phone`", () => {
    expect(
      getContactDisplayPhone({
        other: "+447700900123",
        lastMessage: { sourcePlatform: MessagePlatform.WEBCHAT, sourceIdentifier: null },
      }),
    ).toBe("+447700900123");
  });

  it("never shows a Messenger PSID, which lives in the same `other` column", () => {
    expect(
      getContactDisplayPhone({
        other: "1234567890123456",
        psid: "1234567890123456",
        lastMessage: { sourcePlatform: MessagePlatform.FACEBOOK, sourceIdentifier: "page-1" },
      }),
    ).toBeUndefined();
  });
});

describe("isMetaAiMessage", () => {
  const sent = (tag?: string) =>
    ({
      messageBody: {
        exchangeProcess: "send",
        send: { to: "919188346187", type: "text", biz_opaque_callback_data: tag },
      },
    }) as unknown as Parameters<typeof isMetaAiMessage>[0];

  it("recognises a reply the Meta Business Agent wrote", () => {
    expect(isMetaAiMessage(sent('{"originator":"bizai","channel":"ent"}'))).toBe(true);
  });

  it("leaves every other send alone", () => {
    expect(isMetaAiMessage(sent())).toBe(false);
    expect(isMetaAiMessage(sent('{"originator":"someone-else"}'))).toBe(false);
    expect(isMetaAiMessage(sent("not json"))).toBe(false);
  });
});

describe("inbox row sorting", () => {
  const row = {
    conversationLastMessageAt: "2026-09-25T10:00:00.000Z",
    conversationLastCustomerMessageAt: "2026-09-25T08:00:00.000Z",
  };
  const sort = (rows: Array<typeof row & { id: string }>, key: string) =>
    rows
      .map((r) => ({ id: r.id, time: inboxRowSortTime(r, key) }))
      .sort(compareInboxRowTimes(key))
      .map((r) => r.id);

  it("sorts on last activity by default and on the customer's message for *_wa_created", () => {
    expect(inboxRowSortTime(row, "sortBy:newest")).toBe(Date.parse(row.conversationLastMessageAt));
    expect(inboxRowSortTime(row, "sortBy:newest_wa_created")).toBe(
      Date.parse(row.conversationLastCustomerMessageAt),
    );
  });

  it("falls back to last activity when the customer has not written yet", () => {
    const agentOnly = { conversationLastMessageAt: "2026-09-25T10:00:00.000Z" };
    expect(inboxRowSortTime(agentOnly, "sortBy:oldest_wa_created")).toBe(
      Date.parse(agentOnly.conversationLastMessageAt),
    );
  });

  it("orders newest or oldest first and keeps undated rows last", () => {
    const rows = [
      { ...row, id: "mid", conversationLastMessageAt: "2026-09-25T09:00:00.000Z" },
      { ...row, id: "undated", conversationLastMessageAt: null as unknown as string },
      { ...row, id: "late", conversationLastMessageAt: "2026-09-25T11:00:00.000Z" },
    ];
    expect(sort(rows, "sortBy:newest")).toEqual(["late", "mid", "undated"]);
    expect(sort(rows, "sortBy:oldest")).toEqual(["mid", "late", "undated"]);
  });
});

describe("a sent Instagram template", () => {
  const sent = (payload: Record<string, unknown>) =>
    ({
      sourcePlatform: MessagePlatform.INSTAGRAM,
      messageBody: {
        exchangeProcess: "send",
        send: { recipient: { id: "ig-1" }, message: { attachment: { type: "template", payload } } },
      },
    }) as unknown as Parameters<typeof parseWaMessage>[0];

  it("keeps the product cards so the thread can draw them", () => {
    const parsed = parseWaMessage(
      sent({
        template_type: "generic",
        elements: [{ title: "Mug", subtitle: "USD 12.00", buttons: [{ title: "Buy now" }] }],
      }),
    );
    expect(parsed.messageType).toBe("ig_template");
    expect(parsed.messageContent).toEqual({
      templateType: "generic",
      text: undefined,
      elements: [{ title: "Mug", subtitle: "USD 12.00", buttons: [{ title: "Buy now" }] }],
      buttons: [],
    });
    expect(returnMessageContentBasedOnParsedMessage(parsed, "send")).toBe("Mug");
  });

  it("previews a checkout link by its text", () => {
    const parsed = parseWaMessage(
      sent({ template_type: "button", text: "Pay for your order", buttons: [{ type: "web_url" }] }),
    );
    expect(returnMessageContentBasedOnParsedMessage(parsed, "send")).toBe("Pay for your order");
  });
});

// Postbacks and link visits are stored as `{ type, … }`, not as a message; they used to show
// as "No messages yet" in the thread.
describe("parseWaMessage - Messenger and Instagram events", () => {
  const received = (receive: Record<string, unknown>, platform = MessagePlatform.FACEBOOK) =>
    parseWaMessage({
      sourcePlatform: platform,
      messageBody: { exchangeProcess: "receive", receive },
    } as unknown as Parameters<typeof parseWaMessage>[0]);

  it("shows a tapped button by its title", () => {
    const parsed = received({ type: "postback", title: "Get Started", payload: "GET_STARTED" });

    expect(parsed.messageType).toBe("text");
    expect(parsed.messageContent).toBe("Get Started");
  });

  it("falls back to the payload for a button with no title", () => {
    expect(received({ type: "postback", payload: "MENU_HOURS" }).messageContent).toBe("MENU_HOURS");
  });

  it.each([MessagePlatform.FACEBOOK, MessagePlatform.INSTAGRAM])(
    "shows a %s link visit with its ref",
    (platform) => {
      const parsed = received({ type: "referral", referral: { ref: "summer_sale" } }, platform);

      expect(parsed.messageType).toBe("text");
      expect(parsed.messageContent).toBe("Opened a link (ref: summer_sale)");
    },
  );

  it("shows a link visit with no ref", () => {
    expect(received({ type: "referral", referral: { source: "SHORTLINK" } }).messageContent).toBe(
      "Opened a link",
    );
  });
});

describe("getContactWaAddress", () => {
  it("sends to the phone when there is one", () => {
    expect(getContactWaAddress({ phone: "919876543210", bsuid: "IN.42" })).toBe("919876543210");
  });
  it("falls back to the BSUID for a customer whose phone is withheld", () => {
    expect(getContactWaAddress({ phone: null, bsuid: "IN.42" })).toBe("IN.42");
  });
  it("is undefined with neither", () => {
    expect(getContactWaAddress({ phone: null })).toBeUndefined();
  });
});

describe("getContactLabel", () => {
  it("never shows a BSUID as a number", () => {
    expect(getContactLabel({ bsuid: "IN.42" })).toBe("WhatsApp user");
    expect(getContactLabel({ bsuid: "IN.42", whatsappUserName: "ann" })).toBe("@ann");
    expect(getContactLabel({ phone: "911", bsuid: "IN.42" })).toBe("+911");
  });
});

describe("parseWaMessage - Instagram shared posts, story replies and quotes", () => {
  const received = (message: Record<string, unknown>) =>
    ({
      sourcePlatform: MessagePlatform.INSTAGRAM,
      messageId: "mid-in",
      messageBody: {
        exchangeProcess: "receive",
        receive: { sender: { id: "igsid" }, recipient: { id: "iba" }, timestamp: 1, message },
      },
    }) as unknown as Parameters<typeof parseWaMessage>[0];

  it("reads a shared post (ig_post) with its title and media id", () => {
    const parsed = parseWaMessage(
      received({
        mid: "m1",
        attachments: [
          {
            type: "ig_post",
            payload: {
              url: "https://cdn.example/p.jpg",
              title: "New drop",
              ig_post_media_id: "1789",
            },
          },
        ],
      }),
    );
    expect(parsed.messageType).toBe("ig_shared_post");
    expect(parsed.messageContent).toEqual({
      attachments: [
        {
          content: "https://cdn.example/p.jpg",
          type: "ig_post",
          title: "New drop",
          mediaId: "1789",
        },
      ],
      text: undefined,
    });
    expect(returnMessageContentBasedOnParsedMessage(parsed, "receive")).toBe("Shared a post");
  });

  it("reads a shared reel (ig_reel)", () => {
    const parsed = parseWaMessage(
      received({
        mid: "m2",
        attachments: [
          { type: "ig_reel", payload: { url: "https://cdn.example/r.mp4", title: "Reel" } },
        ],
      }),
    );
    expect(parsed.messageType).toBe("ig_shared_post");
    expect(returnMessageContentBasedOnParsedMessage(parsed, "receive")).toBe("Shared a reel");
  });

  it("reads the legacy share attachment, which carries only a url", () => {
    const parsed = parseWaMessage(
      received({
        mid: "m3",
        attachments: [{ type: "share", payload: { url: "https://cdn.example/s" } }],
      }),
    );
    expect(parsed.messageType).toBe("ig_shared_post");
    expect(parsed.messageContent).toEqual({
      attachments: [
        { content: "https://cdn.example/s", type: "share", title: undefined, mediaId: undefined },
      ],
      text: undefined,
    });
  });

  it("keeps ordinary media as attachments", () => {
    const parsed = parseWaMessage(
      received({
        mid: "m4",
        attachments: [{ type: "image", payload: { url: "https://cdn.example/i" } }],
      }),
    );
    expect(parsed.messageType).toBe("attachments");
    expect(returnMessageContentBasedOnParsedMessage(parsed, "receive")).toBe("Image");
  });

  it("reads a story reply with its story and link sticker", () => {
    const parsed = parseWaMessage(
      received({
        mid: "m5",
        text: "Love this!",
        reply_to: {
          story: {
            id: "st1",
            url: "https://cdn.example/st",
            link_sticker_url: "https://shop.example",
          },
        },
      }),
    );
    expect(parsed.messageType).toBe("ig_story_reply");
    expect(parsed.messageContent).toEqual({
      text: "Love this!",
      story: { id: "st1", url: "https://cdn.example/st", linkStickerUrl: "https://shop.example" },
    });
    expect(returnMessageContentBasedOnParsedMessage(parsed, "receive")).toBe("Love this!");
  });

  it("finds the quoted mid on an inbound inline reply and on a quoted send", () => {
    expect(getReplyToMid(received({ mid: "m6", text: "yes", reply_to: { mid: "m0" } }))).toBe("m0");
    expect(
      getReplyToMid({
        sourcePlatform: MessagePlatform.INSTAGRAM,
        messageBody: {
          exchangeProcess: "send",
          send: { recipient: { id: "igsid" }, reply_to: { mid: "m1" }, message: { text: "ok" } },
        },
      } as unknown as Parameters<typeof getReplyToMid>[0]),
    ).toBe("m1");
    expect(getReplyToMid(received({ mid: "m7", text: "plain" }))).toBeUndefined();
  });

  it("reads Messenger's payload.id as the shared media id", () => {
    const parsed = parseWaMessage(
      received({ mid: "m9", attachments: [{ type: "ig_post", payload: { url: "u", id: "42" } }] }),
    );
    expect(parsed.messageContent).toMatchObject({ attachments: [{ mediaId: "42" }] });
  });

  it("says when Instagram withheld the content", () => {
    const parsed = parseWaMessage(received({ mid: "m10", is_unsupported: true }));
    expect(parsed.messageType).toBe("ig_unsupported");
    expect(returnMessageContentBasedOnParsedMessage(parsed, "receive")).toBe("Unsupported message");
  });

  it("previews a quoted text message", () => {
    expect(getMessagePreview(received({ mid: "m8", text: "Hello there" }))).toBe("Hello there");
  });
});
