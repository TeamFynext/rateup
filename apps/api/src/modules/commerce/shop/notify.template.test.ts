import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  contact: { findUnique: vi.fn() },
  waTemplate: { findUnique: vi.fn() },
}));
const session = vi.hoisted(() => ({ findOpenSession: vi.fn() }));
const templates = vi.hoisted(() => ({ sendTemplateToUserCore: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));
vi.mock("../../meta/shared/metaMessage.service.js", () => ({ sendMetaMessage: vi.fn() }));
vi.mock("../../loyalty/messaging/channels/whatsapp/session.js", () => session);
vi.mock("../../meta/whatsapp/templates/templates.controller.js", () => templates);

const { sendShopMessage } = await import("./notify.js");

const confirm = {
  text: "Please confirm #7",
  buttons: [
    { id: "shop_cod_confirm:o1", title: "Confirm order" },
    { id: "shop_cod_prepay:o1", title: "Pay online, 5% off" },
    { id: "shop_cod_cancel:o1", title: "Cancel" },
  ],
  templateParams: ["Ana", "#7", "$20.00"],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findUnique.mockResolvedValue({
    identities: [{ kind: "PHONE", value: "15555550164" }],
    lastMessageSourceIdentifier: null,
  });
  session.findOpenSession.mockResolvedValue(null);
  db.waTemplate.findUnique.mockResolvedValue({
    data: {
      status: "APPROVED",
      components: [
        { type: "BODY", text: "Confirm {{1}} for {{2}} ok" },
        {
          type: "BUTTONS",
          buttons: [
            { type: "QUICK_REPLY", text: "Confirm order" },
            { type: "QUICK_REPLY", text: "cancel" },
          ],
        },
      ],
    },
  });
  templates.sendTemplateToUserCore.mockResolvedValue({ status: true, message: "ok" });
});

describe("outside the 24-hour window", () => {
  const recipient = { orgId: "org", channel: "WHATSAPP" as const, contactId: "c1" };

  test("the shop's own template gets the values it stands for, and button payloads by title", async () => {
    await sendShopMessage(recipient, confirm, { id: "t1", params: [2, 3] });
    const args = templates.sendTemplateToUserCore.mock.calls[0];
    expect(args[3]).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "#7" },
          { type: "text", text: "$20.00" },
        ],
      },
    ]);
    expect(args[10]).toEqual(["shop_cod_confirm:o1", "shop_cod_cancel:o1"]);
  });

  test("a template picked by hand gets values in order, and its buttons work by title", async () => {
    await sendShopMessage(recipient, confirm, "t1");
    const args = templates.sendTemplateToUserCore.mock.calls[0];
    expect(args[3][0].parameters.map((p: { text: string }) => p.text)).toEqual(["Ana", "#7"]);
    expect(args[10]).toEqual(["shop_cod_confirm:o1", "shop_cod_cancel:o1"]);
  });
});
