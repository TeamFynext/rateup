import { describe, expect, it } from "vitest";

import type { Channel } from "@/backend/channels/channels.api";
import type { MetaChannel } from "@/backend/meta/metaChannels.api";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { MessagePlatform } from "@/types/enums.ts";

import {
  findChannel,
  findChannelAccount,
  getChannelOptions,
  resolveChannel,
} from "./channelOptions.ts";

type Account = WaSettings[number];

const account = (over: Partial<Account> = {}): Account => ({
  id: "s1",
  wabaId: "waba",
  phone: "+15551230000",
  phoneId: "phone-1",
  accessToken: "",
  webhookPassword: "",
  appId: "",
  type: "CLOUD" as Account["type"],
  phoneDisplayName: "",
  assets: [],
  ...over,
});

const messenger = (over: Partial<MetaChannel> = {}): MetaChannel => ({
  id: "fb1",
  orgId: "org",
  platform: "FACEBOOK",
  accountId: "page-1",
  fbPageId: "page-1",
  name: "RateUp",
  username: null,
  pageName: "RateUp",
  status: "ACTIVE",
  createdAt: "2026-10-03T00:00:00.000Z",
  updatedAt: "2026-10-03T00:00:00.000Z",
  address: null,
  ...over,
});

const instagram = (over: Partial<MetaChannel> = {}): MetaChannel => ({
  ...messenger(),
  id: "ig1",
  platform: "INSTAGRAM",
  accountId: "iba-1",
  name: null,
  username: "rateup",
  ...over,
});

const settings = (...accounts: Account[]): WaSettings => accounts;
/** The registry rows the API would list for these numbers and Meta channels. */
const sources = (waSettings: WaSettings, metaChannels: Channel[] = []): Channel[] => [
  ...waSettings.map((number): Channel => ({
    id: number.id,
    orgId: "org",
    platform: "WHATSAPP",
    accountId: number.phoneId,
    address: number.phone,
    name: number.phoneDisplayName || null,
    username: null,
    status: number.status ?? "ACTIVE",
    createdAt: "2026-10-03T00:00:00.000Z",
    updatedAt: "2026-10-03T00:00:00.000Z",
  })),
  ...metaChannels,
];

describe("resolveChannel", () => {
  it("matches a WhatsApp number however the identifier was written", () => {
    const waSettings = settings(account({ phoneDisplayName: "Support Line" }));

    for (const identifier of ["+15551230000", "15551230000"]) {
      expect(resolveChannel(sources(waSettings), MessagePlatform.WHATSAPP, identifier)).toEqual({
        platform: MessagePlatform.WHATSAPP,
        label: "Support Line",
        account: "+15551230000",
        isConnected: true,
      });
    }
  });

  it("falls back to the number when the channel has no name of its own", () => {
    const waSettings = settings(account());
    expect(
      resolveChannel(sources(waSettings), MessagePlatform.WHATSAPP, "15551230000"),
    ).toMatchObject({
      label: "+15551230000",
      account: undefined,
    });
  });

  it("still names a number that is no longer connected", () => {
    const waSettings = settings(account());
    expect(resolveChannel(sources(waSettings), MessagePlatform.WHATSAPP, "+447700900123")).toEqual({
      platform: MessagePlatform.WHATSAPP,
      label: "+447700900123",
      isConnected: false,
    });
  });

  it("names Instagram and Messenger by their own channel rows, with no WhatsApp at all", () => {
    const channels = sources([], [instagram(), messenger()]);
    expect(resolveChannel(channels, MessagePlatform.INSTAGRAM, "iba-1")).toMatchObject({
      label: "@rateup",
      isConnected: true,
    });
    expect(resolveChannel(channels, MessagePlatform.FACEBOOK, "page-1")).toMatchObject({
      label: "RateUp",
      isConnected: true,
    });
  });

  it("does not treat an Instagram account's Page as a connected Messenger channel", () => {
    const channels = sources([], [instagram()]);
    expect(resolveChannel(channels, MessagePlatform.FACEBOOK, "page-1")).toMatchObject({
      isConnected: false,
    });
  });

  it("has nothing to name for webchat, internal notes and legacy messages", () => {
    const waSettings = settings(account());
    expect(resolveChannel(sources(waSettings), MessagePlatform.WEBCHAT, "anything")).toBeNull();
    expect(resolveChannel(sources(waSettings), "INTERNAL", null)).toBeNull();
    expect(resolveChannel(sources(waSettings), MessagePlatform.WHATSAPP, null)).toBeNull();
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

  it("is WhatsApp only: Instagram and Messenger are Page channels", () => {
    const waSettings = settings(account({ phoneId: "iba-1" }));

    expect(findChannelAccount(waSettings, MessagePlatform.INSTAGRAM, "iba-1")).toBeUndefined();
  });

  // An account row with the field blank must not match a blank-ish identifier and
  // hand a send the wrong row.
  it("never matches on an empty account field", () => {
    const waSettings = settings(account({ phone: "", phoneId: "" }));

    expect(findChannelAccount(waSettings, MessagePlatform.WHATSAPP, "no-digits")).toBeUndefined();
    expect(findChannelAccount(waSettings, MessagePlatform.WHATSAPP, "")).toBeUndefined();
  });

  it("has nothing to find for webchat, internal notes and legacy messages", () => {
    const waSettings = settings(account());

    expect(findChannelAccount(waSettings, MessagePlatform.WEBCHAT, "anything")).toBeUndefined();
    expect(findChannelAccount(waSettings, "INTERNAL", null)).toBeUndefined();
    expect(findChannelAccount(waSettings, MessagePlatform.WHATSAPP, null)).toBeUndefined();
    expect(findChannelAccount(undefined, MessagePlatform.WHATSAPP, "96550334145")).toBeUndefined();
  });
});

describe("findChannel", () => {
  it("matches each platform's rows on their own account ids, never across platforms", () => {
    const channels = [instagram(), messenger()];

    expect(findChannel(channels, MessagePlatform.INSTAGRAM, "iba-1")?.id).toBe("ig1");
    expect(findChannel(channels, MessagePlatform.FACEBOOK, "page-1")?.id).toBe("fb1");
    expect(findChannel(channels, MessagePlatform.INSTAGRAM, "page-1")).toBeUndefined();
    expect(findChannel(channels, MessagePlatform.WHATSAPP, "iba-1")).toBeUndefined();
  });

  it("picks the right one of several accounts on the same platform", () => {
    const channels = [
      instagram(),
      instagram({ id: "ig2", accountId: "iba-2", username: "rateup_two" }),
    ];

    expect(findChannel(channels, MessagePlatform.INSTAGRAM, "iba-2")?.id).toBe("ig2");
  });
});

describe("getChannelOptions", () => {
  it("lists Instagram and Messenger from their own channels, independent of WhatsApp", () => {
    // In the API's order: by platform (WhatsApp, Instagram, Facebook), then oldest first.
    const options = getChannelOptions(sources([], [instagram(), messenger()]), {
      platform: "all",
    });

    expect(options).toEqual([
      { value: "iba-1", label: "rateup", status: "ACTIVE", platform: MessagePlatform.INSTAGRAM },
      { value: "page-1", label: "RateUp", status: "ACTIVE", platform: MessagePlatform.FACEBOOK },
    ]);
  });

  it("offers an Instagram account for Instagram only, not its Page for Messenger", () => {
    const channels = sources([], [instagram()]);

    expect(getChannelOptions(channels, { platform: MessagePlatform.FACEBOOK })).toEqual([]);
    expect(getChannelOptions(channels, { platform: MessagePlatform.INSTAGRAM })).toHaveLength(1);
  });

  it("lists every connected account of a platform", () => {
    const channels = sources(
      [],
      [
        messenger(),
        messenger({ id: "fb2", accountId: "page-2", fbPageId: "page-2", name: "Second" }),
      ],
    );

    expect(
      getChannelOptions(channels, { platform: MessagePlatform.FACEBOOK }).map((o) => o.value),
    ).toEqual(["page-1", "page-2"]);
  });

  it("keeps WhatsApp numbers first and honours filterIds", () => {
    const options = getChannelOptions(
      sources([account({ phoneId: "phone-a" })], [instagram(), messenger()]),
      { platform: "all", filterIds: ["phone-a", "iba-1"] },
    );

    expect(options.map((option) => option.value)).toEqual(["phone-a", "iba-1"]);
  });
});

describe("findChannel across platforms", () => {
  it("matches a WhatsApp number on digits or phone id, and nothing on another platform", () => {
    const channels = sources([account({ phone: "+96550334145", phoneId: "phone-a" })]);

    expect(findChannel(channels, MessagePlatform.WHATSAPP, "96550334145")?.accountId).toBe(
      "phone-a",
    );
    expect(findChannel(channels, MessagePlatform.WHATSAPP, "phone-a")?.accountId).toBe("phone-a");
    expect(findChannel(channels, MessagePlatform.INSTAGRAM, "phone-a")).toBeUndefined();
  });

  it("lists any platform the registry holds, including ones added later", () => {
    const webchat: Channel = {
      ...messenger(),
      id: "wc1",
      platform: "WEBCHAT",
      accountId: "widget-1",
      name: "Site chat",
    };

    expect(getChannelOptions([webchat], { platform: "all" })).toEqual([
      {
        value: "widget-1",
        label: "Site chat",
        status: "ACTIVE",
        platform: MessagePlatform.WEBCHAT,
      },
    ]);
  });
});
