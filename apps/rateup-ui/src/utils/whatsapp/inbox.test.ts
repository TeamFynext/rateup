import { describe, expect, it } from "vitest";

import { MessagePlatform } from "@/types/enums.ts";

import { getContactChannelSource, getContactDisplayPhone, isMetaAiMessage } from "./inbox.ts";

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
