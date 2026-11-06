import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({ contact: { findUnique: vi.fn() } }));
const meta = vi.hoisted(() => ({ sendMetaMessage: vi.fn() }));
const session = vi.hoisted(() => ({ findOpenSession: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));
vi.mock("../../whatsapp/meta/metaMessage.service.js", () => meta);
vi.mock("../../loyalty/messaging/channels/whatsapp/session.js", () => session);
vi.mock("../../whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));

const { sendShopMessage } = await import("./notify.js");

const invoice = {
  text: "Here is your invoice",
  document: { url: "https://cdn.test/inv.pdf", filename: "INV-0001.pdf", label: "View invoice" },
};

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findUnique.mockResolvedValue({
    phone: "+15555550164",
    igsId: "ig-1",
    psid: "ps-1",
    lastMessageSourceIdentifier: null,
  });
  meta.sendMetaMessage.mockResolvedValue({ ok: true, messageId: "m1" });
  session.findOpenSession.mockResolvedValue({ phoneId: "phone-1" });
});

describe("sending a document", () => {
  test("WhatsApp gets the file itself, captioned", async () => {
    await sendShopMessage({ orgId: "org", channel: "WHATSAPP", contactId: "c1" }, invoice);
    const payload = meta.sendMetaMessage.mock.calls[0][0].payload;
    expect(payload.type).toBe("document");
    expect(payload.document).toEqual({
      link: "https://cdn.test/inv.pdf",
      filename: "INV-0001.pdf",
      caption: "Here is your invoice",
    });
  });

  test.each(["INSTAGRAM", "MESSENGER"] as const)("%s gets a link button to it", async (channel) => {
    await sendShopMessage({ orgId: "org", channel, contactId: "c1" }, invoice);
    const message = meta.sendMetaMessage.mock.calls[0][0].payload.message;
    expect(message.attachment.payload).toMatchObject({
      template_type: "button",
      text: "Here is your invoice",
      buttons: [{ type: "web_url", url: "https://cdn.test/inv.pdf", title: "View invoice" }],
    });
  });

  test("WhatsApp outside the 24-hour window is not sent", async () => {
    session.findOpenSession.mockResolvedValue(null);
    await expect(
      sendShopMessage({ orgId: "org", channel: "WHATSAPP", contactId: "c1" }, invoice),
    ).resolves.toEqual({ sent: false, reason: "window_closed" });
    expect(meta.sendMetaMessage).not.toHaveBeenCalled();
  });
});
