import { describe, expect, it } from "vitest";

import { MessagePlatform } from "@/constants/enums";

import {
  getMessagePreview,
  getReplyToMid,
  parseWaMessage_,
  returnMessageContentBasedOnParsedMessage,
} from "./utils";

const received = (message: Record<string, unknown>) => ({
  sourcePlatform: MessagePlatform.INSTAGRAM,
  messageBody: { exchangeProcess: "receive" as const, receive: { message } },
});

describe("parseWaMessage_ - Instagram", () => {
  it.each([
    ["ig_post", { url: "https://cdn/p", title: "Drop", ig_post_media_id: "1" }, "Shared a post"],
    ["ig_reel", { url: "https://cdn/r", title: "Reel", reel_video_id: "2" }, "Shared a reel"],
    ["share", { url: "https://cdn/s" }, "Shared a post"],
  ])("reads a shared %s", (type, payload, preview) => {
    const parsed = parseWaMessage_(received({ mid: "m", attachments: [{ type, payload }] }));
    expect(parsed.messageType).toBe("ig_shared_post");
    expect(parsed.messageContent.attachments[0]).toMatchObject({
      content: payload.url,
      type,
      title: "title" in payload ? payload.title : undefined,
    });
    expect(returnMessageContentBasedOnParsedMessage(parsed, "receive")).toBe(preview);
  });

  it("reads a story reply", () => {
    const parsed = parseWaMessage_(
      received({
        mid: "m",
        text: "Nice",
        reply_to: { story: { id: "s", url: "https://cdn/st", link_sticker_url: "https://x" } },
      }),
    );
    expect(parsed.messageType).toBe("ig_story_reply");
    expect(parsed.messageContent).toEqual({
      text: "Nice",
      story: { id: "s", url: "https://cdn/st", linkStickerUrl: "https://x" },
    });
  });

  it("finds the quoted mid inbound and on a quoted send", () => {
    expect(getReplyToMid(received({ mid: "m", text: "a", reply_to: { mid: "q" } }))).toBe("q");
    expect(
      getReplyToMid({
        sourcePlatform: MessagePlatform.INSTAGRAM,
        messageBody: { exchangeProcess: "send", send: { reply_to: { mid: "q2" } } },
      }),
    ).toBe("q2");
  });

  it("previews a quoted text message", () => {
    expect(getMessagePreview(received({ mid: "m", text: "Hello" }))).toBe("Hello");
  });
});

describe("parseWaMessage_ - message types with their own bubble", () => {
  const waReceived = (msg: Record<string, unknown>) => ({
    sourcePlatform: MessagePlatform.WHATSAPP,
    messageBody: { exchangeProcess: "receive" as const, receive: { messages: [msg] } },
  });

  it("reads a WhatsApp sticker's media id", () => {
    const parsed = parseWaMessage_(waReceived({ type: "sticker", sticker: { id: "st-1" } }));
    expect(parsed).toMatchObject({ messageType: "sticker", messageContent: "st-1" });
  });

  it("keeps a button reply's text", () => {
    const parsed = parseWaMessage_(waReceived({ type: "button", button: { text: "Yes" } }));
    expect(parsed).toMatchObject({ messageType: "button", messageContent: "Yes" });
  });

  it("keeps a comment's post link", () => {
    const parsed = parseWaMessage_(
      received({ comment_id: "c1", text: "Nice", media_permalink: "https://instagram.com/p/x" }),
    );
    expect(parsed.messageType).toBe("ig_comment");
    expect(parsed.messageContent).toMatchObject({
      text: "Nice",
      permalink: "https://instagram.com/p/x",
    });
  });

  it("draws a file we sent on Instagram as a document named from its URL", () => {
    const parsed = parseWaMessage_({
      sourcePlatform: MessagePlatform.INSTAGRAM,
      messageBody: {
        exchangeProcess: "send" as const,
        send: {
          message: {
            attachment: { type: "file", payload: { url: "https://cdn/x/Price%20list.pdf?sig=1" } },
          },
        },
      },
    });
    expect(parsed.messageType).toBe("document");
    expect(parsed.messageContent).toBe(
      "https://cdn/x/Price%20list.pdf?sig=1_caption_Price list.pdf_caption_",
    );
  });

  it("previews an order in the inbox list", () => {
    expect(
      returnMessageContentBasedOnParsedMessage({
        timeStamp: "",
        messageType: "order",
        messageContent: {},
      }),
    ).toBe("🛒 Order");
  });
});
