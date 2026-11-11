import { describe, expect, it } from "vitest";
import { isSessionWindowOpen } from "./sessionWindow";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

const whatsapp = (h: number) => ({
  lastReceivedMessageTimeStamp: hoursAgo(h),
  lastMessage: { sourcePlatform: "WHATSAPP" },
});
const instagram = (h: number) => ({
  lastReceivedMessageTimeStamp: hoursAgo(h),
  lastMessage: { sourcePlatform: "INSTAGRAM" },
});

describe("isSessionWindowOpen", () => {
  it("is closed when the customer never wrote", () => {
    expect(isSessionWindowOpen({ lastReceivedMessageTimeStamp: null })).toBe(false);
  });

  it("keeps WhatsApp to 24 hours", () => {
    expect(isSessionWindowOpen(whatsapp(23))).toBe(true);
    expect(isSessionWindowOpen(whatsapp(25))).toBe(false);
  });

  it("keeps Instagram open for 7 days (Human Agent window)", () => {
    expect(isSessionWindowOpen(instagram(25))).toBe(true);
    expect(isSessionWindowOpen(instagram(6 * 24))).toBe(true);
    expect(isSessionWindowOpen(instagram(8 * 24))).toBe(false);
  });

  it("treats a Messenger contact with no messages loaded by its psid", () => {
    expect(isSessionWindowOpen({ lastReceivedMessageTimeStamp: hoursAgo(48), psid: "p1" })).toBe(
      true,
    );
  });
});
