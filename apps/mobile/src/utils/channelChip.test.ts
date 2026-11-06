import { describe, expect, test } from "vitest";
import type { Channel } from "@/api/channels/channels.api";
import { resolveChannel } from "./chatbox_utils";

const channel = (over: Partial<Channel>): Channel => ({
  id: "ch",
  platform: "INSTAGRAM",
  accountId: "1",
  address: null,
  name: null,
  username: null,
  status: "ACTIVE",
  ...over,
});

const CHANNELS = [
  channel({
    platform: "INSTAGRAM",
    accountId: "17841476126718028",
    username: "fynext_innovations_",
  }),
  channel({ platform: "FACEBOOK", accountId: "1924381580960288", name: "Fynext Innovations" }),
  channel({
    platform: "INSTAGRAM",
    accountId: "999",
    name: "Fynext Store",
    username: "fynext_store",
  }),
  channel({
    platform: "WHATSAPP",
    accountId: "phone-id-1",
    address: "+91 98765 43210",
    name: "Support",
  }),
];

describe("the inbox channel chip", () => {
  test("webchat is named, with no account behind it", () => {
    expect(resolveChannel(undefined, "WEBCHAT", null, CHANNELS)).toEqual({
      platform: "WEBCHAT",
      label: "Web chat",
      isConnected: true,
    });
  });

  test("a Messenger Page shows its name", () => {
    expect(resolveChannel(undefined, "FACEBOOK", "1924381580960288", CHANNELS)?.label).toBe(
      "Fynext Innovations",
    );
  });

  test("an Instagram account shows its name, with the handle beside it", () => {
    expect(resolveChannel(undefined, "INSTAGRAM", "999", CHANNELS)).toMatchObject({
      label: "Fynext Store",
      account: "@fynext_store",
      isConnected: true,
    });
  });

  test("an Instagram account with no name falls back to its handle", () => {
    expect(resolveChannel(undefined, "INSTAGRAM", "17841476126718028", CHANNELS)?.label).toBe(
      "@fynext_innovations_",
    );
  });

  test("an account the org no longer has is shown by its id, marked disconnected", () => {
    expect(resolveChannel(undefined, "INSTAGRAM", "555", CHANNELS)).toMatchObject({
      label: "555",
      isConnected: false,
    });
  });

  test("a WhatsApp number matches on digits and shows the number's name", () => {
    expect(resolveChannel(undefined, "WHATSAPP", "919876543210", CHANNELS)).toMatchObject({
      label: "Support",
      account: "+91 98765 43210",
    });
  });
});
