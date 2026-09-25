import { describe, expect, it } from "vitest";

import { MessagePlatform } from "@/types/enums.ts";

import {
  compareInboxRowTimes,
  getContactChannelSource,
  getContactDisplayPhone,
  inboxRowSortTime,
  isMetaAiMessage,
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
