import { describe, expect, test, vi } from "vitest";

// channels.api imports the authenticated axios instance; only its constant is used here.
vi.mock("@/api/channels/channels.api", () => ({ WEBCHAT_FILTER: "webchat" }));
const { channelFilterOptions } = await import("./channelFilterOptions");

const base = { id: "c", address: null, name: null, username: null, status: "ACTIVE" };
const CHANNELS = [
  { ...base, platform: "WHATSAPP" as const, accountId: "pid-1", address: "+1555-132-3034" },
  {
    ...base,
    platform: "WHATSAPP" as const,
    accountId: "pid-2",
    address: "+1555-900-2244",
    name: "Sales",
  },
  {
    ...base,
    platform: "INSTAGRAM" as const,
    accountId: "17841476126718028",
    username: "fynext_innovations_",
  },
  {
    ...base,
    platform: "FACEBOOK" as const,
    accountId: "1924381580960288",
    name: "Fynext Innovations",
  },
];

describe("channelFilterOptions", () => {
  test("lists every channel, Instagram and Messenger included, then Web chat", () => {
    expect(channelFilterOptions(CHANNELS, undefined, true)).toEqual([
      { label: "All Channels", value: "all" },
      { label: "+1555-132-3034", value: "+1555-132-3034", platform: "WHATSAPP" },
      { label: "Sales · +1555-900-2244", value: "+1555-900-2244", platform: "WHATSAPP" },
      { label: "@fynext_innovations_", value: "17841476126718028", platform: "INSTAGRAM" },
      { label: "Fynext Innovations", value: "1924381580960288", platform: "FACEBOOK" },
      { label: "Web chat", value: "webchat", platform: "WEBCHAT" },
    ]);
  });

  test("leaves Web chat out when the org has had no webchat visitors", () => {
    expect(channelFilterOptions(CHANNELS, undefined, false).map((o) => o.value)).not.toContain(
      "webchat",
    );
  });

  test("falls back to the WhatsApp numbers from settings without a channel list", () => {
    const waSettings = [{ phone: "+1555-132-3034" }] as any;
    expect(channelFilterOptions(undefined, waSettings, false)).toEqual([
      { label: "All Channels", value: "all" },
      { label: "+1555-132-3034", value: "+1555-132-3034", platform: "WHATSAPP" },
    ]);
  });
});
