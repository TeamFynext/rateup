import { expect, test, vi } from "vitest";

vi.mock("./channels/whatsapp/adapter.js", () => ({ whatsappChannel: { id: "WHATSAPP" } }));

import { AVAILABLE_LOYALTY_CHANNELS } from "./channelIds.js";
import { loyaltyChannels } from "./registry.js";

// The schemas validate `enabledChannels` against the list; the router sends through the
// registry. A channel in one and not the other is either unselectable or unsendable.
test("every channel that can be switched on has an adapter, and no other", () => {
  expect(Object.keys(loyaltyChannels()).sort()).toEqual([...AVAILABLE_LOYALTY_CHANNELS].sort());
  for (const [id, channel] of Object.entries(loyaltyChannels())) expect(channel?.id).toBe(id);
});
