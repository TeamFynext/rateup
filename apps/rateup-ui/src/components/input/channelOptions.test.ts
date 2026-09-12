import { describe, expect, it } from "vitest";

import { MessagePlatform } from "@/types/enums.ts";

import { findChannelAccount, resolveChannel } from "./channelOptions.ts";

type Settings = Parameters<typeof resolveChannel>[0];

const account = (over: Record<string, unknown> = {}) =>
  ({
    id: "s1",
    wabaId: "waba",
    phone: "+15551230000",
    phoneId: "phone-1",
    accessToken: "",
    webhookPassword: "",
    appId: "",
    type: "CLOUD",
    fbPageId: "",
    fbUserName: "",
    ibaId: "",
    pageAccessToken: "",
    igUserName: "",
    phoneDisplayName: "",
    igDisplayName: "",
    assets: [],
    ...over,
  }) as unknown as NonNullable<Settings>[number];

const settings = (...accounts: NonNullable<Settings>[number][]) => accounts as Settings;

describe("resolveChannel", () => {
  it("matches a WhatsApp number however the identifier was written", () => {
    const waSettings = settings(account({ phoneDisplayName: "Support Line" }));

    for (const identifier of ["+15551230000", "15551230000"]) {
      expect(resolveChannel(waSettings, MessagePlatform.WHATSAPP, identifier)).toEqual({
        platform: MessagePlatform.WHATSAPP,
        label: "Support Line",
        account: "+15551230000",
        isConnected: true,
      });
    }
  });

  it("falls back to the number when the channel has no name of its own", () => {
    const waSettings = settings(account());
    expect(resolveChannel(waSettings, MessagePlatform.WHATSAPP, "15551230000")).toMatchObject({
      label: "+15551230000",
      account: undefined,
    });
  });

  it("still names a number that is no longer connected", () => {
    const waSettings = settings(account());
    expect(resolveChannel(waSettings, MessagePlatform.WHATSAPP, "+447700900123")).toEqual({
      platform: MessagePlatform.WHATSAPP,
      label: "+447700900123",
      isConnected: false,
    });
  });

  it("names Instagram and Facebook by their account, not by the number", () => {
    const waSettings = settings(
      account({ ibaId: "iba-1", igUserName: "rateup", fbPageId: "page-1", fbUserName: "RateUp" }),
    );
    expect(resolveChannel(waSettings, MessagePlatform.INSTAGRAM, "iba-1")).toMatchObject({
      label: "@rateup",
    });
    expect(resolveChannel(waSettings, MessagePlatform.FACEBOOK, "page-1")).toMatchObject({
      label: "RateUp",
    });
  });

  it("has nothing to name for webchat, internal notes and legacy messages", () => {
    const waSettings = settings(account());
    expect(resolveChannel(waSettings, MessagePlatform.WEBCHAT, "anything")).toBeNull();
    expect(resolveChannel(waSettings, "INTERNAL", null)).toBeNull();
    expect(resolveChannel(waSettings, MessagePlatform.WHATSAPP, null)).toBeNull();
  });
});

describe("findChannelAccount", () => {
  /**
   * The reply box picks the number to send on with this. Matching it with `===`
   * never held — the webhook writes `+965…` and our own sends write `965…` — so
   * no conversation ever resolved a channel, every reply fell back to the org's
   * oldest number, and a customer who had written to a different one got a
   * 131047 "Re-engagement message" instead of an answer.
   */
  it("matches a WhatsApp number across both spellings of it", () => {
    const waSettings = settings(account({ phone: "+96550334145", phoneId: "phone-a" }));

    for (const identifier of ["96550334145", "+96550334145", "+965 50334145"]) {
      expect(findChannelAccount(waSettings, MessagePlatform.WHATSAPP, identifier)?.phoneId).toBe(
        "phone-a",
      );
    }
  });

  it("matches a WhatsApp channel by phone id too", () => {
    const waSettings = settings(account({ phoneId: "phone-a" }));

    expect(findChannelAccount(waSettings, MessagePlatform.WHATSAPP, "phone-a")?.phoneId).toBe(
      "phone-a",
    );
  });

  it("picks the account the identifier names out of several", () => {
    const waSettings = settings(
      account({ id: "s1", phone: "+96522284525", phoneId: "phone-a" }),
      account({ id: "s2", phone: "+96550334145", phoneId: "phone-b" }),
    );

    expect(findChannelAccount(waSettings, MessagePlatform.WHATSAPP, "96550334145")?.phoneId).toBe(
      "phone-b",
    );
  });

  // A customer's number is not one of the org's channels. Before the echo handler
  // was fixed it was what echoed sends recorded, and naming a channel for it
  // would have sent the next reply to the customer's own number.
  it("names no account for a number the org has not connected", () => {
    const waSettings = settings(account({ phone: "+96550334145", phoneId: "phone-a" }));

    expect(findChannelAccount(waSettings, MessagePlatform.WHATSAPP, "96596908846")).toBeUndefined();
  });

  it("matches Instagram and Facebook on their own ids, and never across platforms", () => {
    const waSettings = settings(account({ ibaId: "iba-1", fbPageId: "page-1" }));

    expect(findChannelAccount(waSettings, MessagePlatform.INSTAGRAM, "iba-1")?.ibaId).toBe("iba-1");
    expect(findChannelAccount(waSettings, MessagePlatform.FACEBOOK, "page-1")?.fbPageId).toBe(
      "page-1",
    );
    expect(findChannelAccount(waSettings, MessagePlatform.INSTAGRAM, "page-1")).toBeUndefined();
  });

  // An account row with the field blank must not match a blank-ish identifier and
  // hand a send the wrong row.
  it("never matches on an empty account field", () => {
    const waSettings = settings(account({ phone: "", phoneId: "", ibaId: "", fbPageId: "" }));

    expect(findChannelAccount(waSettings, MessagePlatform.WHATSAPP, "no-digits")).toBeUndefined();
    expect(findChannelAccount(waSettings, MessagePlatform.INSTAGRAM, "")).toBeUndefined();
  });

  it("has nothing to find for webchat, internal notes and legacy messages", () => {
    const waSettings = settings(account());

    expect(findChannelAccount(waSettings, MessagePlatform.WEBCHAT, "anything")).toBeUndefined();
    expect(findChannelAccount(waSettings, "INTERNAL", null)).toBeUndefined();
    expect(findChannelAccount(waSettings, MessagePlatform.WHATSAPP, null)).toBeUndefined();
    expect(findChannelAccount(undefined, MessagePlatform.WHATSAPP, "96550334145")).toBeUndefined();
  });
});
