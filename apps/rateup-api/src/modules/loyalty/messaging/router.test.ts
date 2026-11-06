import { describe, expect, test, vi } from "vitest";

vi.mock("./registry.js", () => ({
  getLoyaltyChannel: (id: string) => (["WHATSAPP", "SMS"].includes(id) ? { id } : undefined),
}));

import { candidateChannels } from "./router.js";

describe("candidateChannels", () => {
  const notify = { kind: "notify" } as const;

  test("the member's own channel first, then the programme's order", () => {
    expect(
      candidateChannels(
        { enabledChannels: ["WHATSAPP", "SMS"] },
        { preferredChannel: "SMS" },
        notify,
      ),
    ).toEqual(["SMS", "WHATSAPP"]);
  });

  test("a preference the programme does not offer is ignored", () => {
    expect(
      candidateChannels({ enabledChannels: ["WHATSAPP"] }, { preferredChannel: "SMS" }, notify),
    ).toEqual(["WHATSAPP"]);
  });

  test("a channel with no adapter is never tried", () => {
    expect(
      candidateChannels(
        { enabledChannels: ["RCS", "WHATSAPP"] },
        { preferredChannel: null },
        notify,
      ),
    ).toEqual(["WHATSAPP"]);
  });

  test("with no programme, WhatsApp", () => {
    expect(candidateChannels(null, { preferredChannel: null }, notify)).toEqual(["WHATSAPP"]);
  });

  test("a reply goes back where the customer wrote, whatever the programme offers", () => {
    expect(
      candidateChannels(
        { enabledChannels: ["WHATSAPP"] },
        { preferredChannel: "WHATSAPP" },
        { kind: "reply", channel: "SMS" },
      ),
    ).toEqual(["SMS"]);
  });
});
