import { describe, expect, it } from "vitest";

import { WhatsappSettingsStatus } from "@/types/enums.ts";

import {
  formatWhatsappNumber,
  pickJoinKeyword,
  pickWhatsappNumber,
  whatsappJoinUrl,
} from "./joinLink.ts";

describe("pickJoinKeyword", () => {
  it("prefers the saved join reply over the starter pack", () => {
    const saved = [{ type: "CustomerRegistration", requestMessage: " hello " }];
    const preset = [{ type: "CustomerRegistration", requestMessage: "join" }];
    expect(pickJoinKeyword(saved, preset)).toBe("hello");
  });

  it("falls back to the preset, then to 'join'", () => {
    const preset = [{ type: "CustomerRegistration", requestMessage: "start" }];
    expect(pickJoinKeyword([], preset)).toBe("start");
    expect(pickJoinKeyword([{ type: "PointInformation", requestMessage: "points" }])).toBe("join");
  });
});

describe("pickWhatsappNumber", () => {
  const channels = [
    { id: "a", phone: "+91 98765 43210", status: WhatsappSettingsStatus.ACTIVE },
    { id: "b", phone: "+44 7700 900123", status: WhatsappSettingsStatus.ACTIVE },
    { id: "c", phone: "+1 555 0100", status: WhatsappSettingsStatus.DISCONNECTED },
  ];

  it("returns digits only, preferring the programme's channel", () => {
    expect(pickWhatsappNumber(channels, "b")).toBe("447700900123");
    expect(pickWhatsappNumber(channels)).toBe("919876543210");
  });

  it("never picks a disconnected channel and is null with none", () => {
    expect(pickWhatsappNumber(channels, "c")).toBe("919876543210");
    expect(pickWhatsappNumber([channels[2]])).toBeNull();
    expect(pickWhatsappNumber(undefined)).toBeNull();
    expect(pickWhatsappNumber([])).toBeNull();
  });

  it("treats a legacy row without a status as live", () => {
    expect(pickWhatsappNumber([{ id: "x", phone: "919999999999", status: undefined }])).toBe(
      "919999999999",
    );
  });
});

describe("whatsappJoinUrl", () => {
  it("encodes the keyword into a wa.me link", () => {
    expect(whatsappJoinUrl("919876543210", "join club")).toBe(
      "https://wa.me/919876543210?text=join%20club",
    );
  });
});

describe("formatWhatsappNumber", () => {
  it("formats a valid number internationally and leaves junk readable", () => {
    expect(formatWhatsappNumber("919876543210")).toBe("+91 98765 43210");
    expect(formatWhatsappNumber("1")).toBe("+1");
  });
});
