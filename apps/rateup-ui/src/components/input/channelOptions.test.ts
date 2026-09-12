import { describe, expect, it } from "vitest";

import { MessagePlatform } from "@/types/enums.ts";

import { resolveChannel } from "./channelOptions.ts";

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
