import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({ channel: { findFirst: vi.fn() } }));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { info: vi.fn(), warn: vi.fn() } }));
vi.mock("../../channel/channel.service.js", () => ({
  resolveChannelId: vi.fn().mockResolvedValue("ig-channel"),
}));
const send = vi.hoisted(() => ({ sendSendApiGenericTemplate: vi.fn() }));
vi.mock("../../whatsapp/meta/sendApiMessages.js", () => send);
const ig = vi.hoisted(() => ({ sendInstagramPrivateReply: vi.fn() }));
vi.mock("../../whatsapp/instagram/instagram_messaging.service.js", () => ig);
vi.mock("../contact.service.js", () => ({
  getOrCreateContactByIgsId: vi.fn(),
  getOrCreateContactByPsid: vi.fn(),
}));
vi.mock("../identity/identity.service.js", () => ({
  findContactIdByIdentity: vi.fn().mockResolvedValue("ig-contact"),
}));
const svc = vi.hoisted(() => ({ issueHandoffCode: vi.fn(), buildHandoffLink: vi.fn() }));
vi.mock("./handoff.service.js", () => svc);
vi.mock("../../../generated/prisma/enums.js", () => ({
  PlatformType: { WHATSAPP: "WHATSAPP", INSTAGRAM: "INSTAGRAM", FACEBOOK: "FACEBOOK" },
  ContactIdentityKind: { IG_SCOPED: "IG_SCOPED", FB_PSID: "FB_PSID" },
}));

import { runContinueOnWhatsappStep } from "./handoff.journey.js";

const channel = { platform: "INSTAGRAM" as const, accountId: "iba-1" };

beforeEach(() => {
  vi.clearAllMocks();
  db.channel.findFirst.mockResolvedValue({ id: "wa-channel", address: "+91 98765 43210" });
  svc.issueHandoffCode.mockResolvedValue({ code: "K7P2QM9X", expiresAt: new Date() });
  svc.buildHandoffLink.mockReturnValue("https://wa.me/919876543210?text=x");
});

describe("Continue on WhatsApp step", () => {
  test("issues a code for the contact and sends a card with the wa.me button", async () => {
    const sent = await runContinueOnWhatsappStep({
      data: { channelId: "wa-channel", body: "Chat with us", buttonLabel: "Open", prefill: "Hi" },
      recipientId: "igsid-1",
      orgId: "org-1",
      channel,
    });
    expect(sent).toBe(true);
    expect(svc.issueHandoffCode).toHaveBeenCalledWith({
      orgId: "org-1",
      sourceContactId: "ig-contact",
      sourceChannelId: "ig-channel",
      targetChannelId: "wa-channel",
      targetPlatform: "WHATSAPP",
    });
    expect(svc.buildHandoffLink).toHaveBeenCalledWith(
      expect.objectContaining({ address: "+91 98765 43210", code: "K7P2QM9X", prefill: "Hi" }),
    );
    expect(send.sendSendApiGenericTemplate).toHaveBeenCalledWith(channel, "igsid-1", "org-1", [
      {
        title: "Chat with us",
        buttons: [{ type: "web_url", title: "Open", url: "https://wa.me/919876543210?text=x" }],
      },
    ]);
  });

  test("a number outside the org (or none) skips the step", async () => {
    db.channel.findFirst.mockResolvedValue(null);
    const sent = await runContinueOnWhatsappStep({
      data: { channelId: "other" },
      recipientId: "igsid-1",
      orgId: "org-1",
      channel,
    });
    expect(sent).toBe(false);
    expect(svc.issueHandoffCode).not.toHaveBeenCalled();
    expect(send.sendSendApiGenericTemplate).not.toHaveBeenCalled();
  });

  test("a comment reply goes out as a text private reply with the link", async () => {
    await runContinueOnWhatsappStep({
      data: { channelId: "wa-channel", body: "Chat with us" },
      recipientId: "igsid-1",
      orgId: "org-1",
      channel,
      commentId: "comment-1",
    });
    expect(ig.sendInstagramPrivateReply).toHaveBeenCalledWith(
      "comment-1",
      "Chat with us\nhttps://wa.me/919876543210?text=x",
      "iba-1",
      "org-1",
      "igsid-1",
    );
    expect(send.sendSendApiGenericTemplate).not.toHaveBeenCalled();
  });
});
