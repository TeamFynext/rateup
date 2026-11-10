import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopStore: { findUnique: vi.fn() },
  contact: { findFirst: vi.fn() },
  shopProduct: { findMany: vi.fn() },
}));
const meta = vi.hoisted(() => ({ sendMetaMessage: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../whatsapp/meta/metaMessage.service.js", () => meta);
vi.mock("../../loyalty/messaging/channels/whatsapp/session.js", () => ({
  findOpenSession: vi.fn(),
}));
vi.mock("./events.js", () => ({ storefrontUrl: (slug: string) => `https://shop.test/s/${slug}` }));

const { sendProductsInChat } = await import("./chatProducts.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  db.shopStore.findUnique.mockResolvedValue({
    id: "s1",
    slug: "fern",
    name: "Fern",
    currency: "USD",
    storefrontEnabled: false,
  });
  db.contact.findFirst.mockResolvedValue({
    identities: [
      { kind: "IG_SCOPED", value: "ig-1" },
      { kind: "FB_PSID", value: "ps-1" },
    ],
  });
  db.shopProduct.findMany.mockResolvedValue([
    {
      id: "p1",
      title: "Mug",
      images: [],
      variants: [{ id: "v1", price: 12, trackInventory: false, stock: 0, allowBackorder: false }],
    },
  ]);
  meta.sendMetaMessage.mockResolvedValue({ ok: true });
});

const input = { orgId: "org", contactId: "c1", productIds: ["p1"] };

describe("product cards on Instagram and Messenger", () => {
  test.each(["INSTAGRAM", "MESSENGER"] as const)(
    "send the agent's note on %s before the carousel",
    async (channel) => {
      await sendProductsInChat({ ...input, channel, text: "  These just came in  " });

      expect(meta.sendMetaMessage).toHaveBeenCalledTimes(2);
      expect(meta.sendMetaMessage.mock.calls[0][0].payload.message).toEqual({
        text: "These just came in",
      });
      expect(meta.sendMetaMessage.mock.calls[1][0].payload.message.attachment.type).toBe(
        "template",
      );
    },
  );

  test("send only the carousel when there is no note", async () => {
    await sendProductsInChat({ ...input, channel: "INSTAGRAM", text: " " });

    expect(meta.sendMetaMessage).toHaveBeenCalledTimes(1);
    expect(meta.sendMetaMessage.mock.calls[0][0].payload.message.attachment).toBeDefined();
  });

  test("stop before the cards when the note is refused", async () => {
    meta.sendMetaMessage.mockResolvedValueOnce({ ok: false, error: "Outside the window" });

    await expect(
      sendProductsInChat({ ...input, channel: "INSTAGRAM", text: "Hi" }),
    ).rejects.toMatchObject({ message: "Outside the window" });
    expect(meta.sendMetaMessage).toHaveBeenCalledTimes(1);
  });
});
