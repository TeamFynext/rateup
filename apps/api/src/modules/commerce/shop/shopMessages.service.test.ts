import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const db = vi.hoisted(() => ({
  shopStore: { findUnique: vi.fn(), update: vi.fn() },
  waTemplate: { findFirst: vi.fn(), findMany: vi.fn() },
  whatsappSettings: { count: vi.fn() },
}));
const text = vi.hoisted(() => ({ submitTextTemplate: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));
vi.mock("../../meta/whatsapp/templates/textTemplate.service.js", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../meta/whatsapp/templates/textTemplate.service.js")
  >()),
  submitTextTemplate: text.submitTextTemplate,
}));
vi.mock("../../meta/whatsapp/templates/templates.service.js", () => ({}));
vi.mock("../../meta/shared/metaMessage.service.js", () => ({ sendMetaMessage: vi.fn() }));
vi.mock("../../loyalty/messaging/channels/whatsapp/session.js", () => ({
  findOpenSession: vi.fn(),
}));
vi.mock("../../meta/whatsapp/templates/templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));

const { saveShopMessage } = await import("./shopMessages.service.js");

let saved: Record<string, unknown>;
const store = { id: "s1", orgId: "org" } as const;
const save = (key: string, body: string | null, enabled?: boolean) =>
  saveShopMessage({
    store: { ...store, notifications: saved },
    key,
    body,
    enabled,
    makeTemplate: true,
  });

beforeEach(() => {
  vi.clearAllMocks();
  saved = {};
  db.shopStore.findUnique.mockImplementation(async () => ({ notifications: saved }));
  db.shopStore.update.mockImplementation(async ({ data }) => {
    saved = data.notifications;
  });
  db.waTemplate.findMany.mockResolvedValue([]);
  db.waTemplate.findFirst.mockResolvedValue(null);
  db.whatsappSettings.count.mockResolvedValue(1);
  text.submitTextTemplate.mockResolvedValue({
    templateId: "tpl-1",
    templateName: "shop_order_packed",
    status: "pending",
  });
});

describe("saving a message's words", () => {
  test("keeps them for open chats and asks Meta for nothing unless told to", async () => {
    const result = await saveShopMessage({
      store: { ...store, notifications: saved },
      key: "packed",
      body: "Order {{2}} packed ok",
    });
    expect(saved.packed).toEqual({ body: "Order {{2}} packed ok" });
    expect(text.submitTextTemplate).not.toHaveBeenCalled();
    expect(db.whatsappSettings.count).not.toHaveBeenCalled();
    expect(result).toMatchObject({ template: null, templateError: null });
  });

  test("shows a picked template's words and buttons, and flags its own once outdated", async () => {
    saved = {
      cod_confirm: { waTemplateId: "mine" },
      packed: {
        body: "New {{2}} words",
        waTemplateId: "own",
        templateMap: { waTemplateId: "own", params: [2] },
      },
    };
    db.waTemplate.findMany.mockResolvedValue([
      {
        id: "mine",
        data: {
          name: "my_confirm",
          status: "APPROVED",
          components: [
            { type: "BODY", text: "Please confirm {{2}}" },
            { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Confirm order" }] },
          ],
        },
      },
      {
        id: "own",
        data: {
          name: "shop_order_packed",
          status: "APPROVED",
          components: [{ type: "BODY", text: "Old {{1}} words" }],
        },
      },
    ]);
    const { listShopMessages } = await import("./shopMessages.service.js");
    const list = await listShopMessages({ ...store, notifications: saved });
    expect(list.find((m) => m.key === "cod_confirm")).toMatchObject({
      templateKind: "picked",
      templateBody: "Please confirm {{2}}",
      templateQuickReplies: ["Confirm order"],
      templateOutdated: false,
    });
    expect(list.find((m) => m.key === "packed")).toMatchObject({
      templateKind: "own",
      templateOutdated: true,
    });
  });

  test("keeps them and submits them as the message's template, renumbered", async () => {
    const result = await save("packed", "Good news: {{2}} is packed today.");
    expect(text.submitTextTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        baseName: "shop_order_packed",
        body: "Good news: {{1}} is packed today.",
        current: null,
        examples: ["#1001"],
      }),
    );
    expect(saved.packed).toEqual({
      body: "Good news: {{2}} is packed today.",
      waTemplateId: "tpl-1",
      templateMap: { waTemplateId: "tpl-1", params: [2] },
    });
    expect(result.template).toMatchObject({ templateId: "tpl-1", status: "pending" });
    expect(result.templateError).toBeNull();
  });

  test("gives the template its quick replies", async () => {
    await save("cod_confirm", "Please confirm {{2}} for {{3}} soon.");
    expect(text.submitTextTemplate.mock.calls[0][0].buttons).toEqual([
      { type: "QUICK_REPLY", text: "Confirm order" },
      { type: "QUICK_REPLY", text: "Cancel" },
    ]);
  });

  test("edits the shop's own template, but never one the store picked by hand", async () => {
    saved = { packed: { waTemplateId: "own" }, shipped: { waTemplateId: "theirs" } };
    db.waTemplate.findFirst.mockImplementation(async ({ where }) => ({
      id: where.id,
      whatsappSettingsPhoneId: null,
      data: { name: where.id === "own" ? "shop_order_packed_v2" : "my_generic_update" },
    }));
    await save("packed", "Order {{2}} packed ok");
    expect(text.submitTextTemplate.mock.calls[0][0].current).toMatchObject({ id: "own" });
    await save("shipped", "Order {{2}} shipped ok");
    expect(text.submitTextTemplate.mock.calls[1][0].current).toBeNull();
  });

  test("null goes back to the default words, which are submitted", async () => {
    saved = { packed: { body: "Mine {{2}} ok" } };
    const result = await save("packed", null);
    expect(result.message).toMatchObject({
      customBody: false,
      body: expect.stringContaining("{{2}}"),
    });
    expect(text.submitTextTemplate.mock.calls[0][0].body).toBe(
      "Order {{1}} is packed and will ship soon.",
    );
  });

  test("keeps the words when there is no WhatsApp number to make a template on", async () => {
    db.whatsappSettings.count.mockResolvedValue(0);
    const result = await save("packed", "Order {{2}} packed ok", true);
    expect(saved.packed).toEqual({ body: "Order {{2}} packed ok", enabled: true });
    expect(result.template).toBeNull();
    expect(result.templateError).toMatch(/WhatsApp number/);
    expect(text.submitTextTemplate).not.toHaveBeenCalled();
  });

  test("keeps the words and says why when Meta refuses the template", async () => {
    text.submitTextTemplate.mockRejectedValue(new Error("Invalid parameter"));
    const result = await save("packed", "Order {{2}} packed ok");
    expect(saved.packed).toMatchObject({ body: "Order {{2}} packed ok" });
    expect(result.templateError).toMatch(/Invalid parameter/);
  });

  test("says why words that end on a variable can't be a template", async () => {
    const result = await save("packed", "Packed: {{2}}");
    expect(result.templateError).toMatch(/start or end/);
    expect(text.submitTextTemplate).not.toHaveBeenCalled();
  });

  test("refuses a variable the message doesn't have, or an unknown message", async () => {
    await expect(save("packed", "Order {{9}}")).rejects.toThrow(/\{\{9\}\}/);
    await expect(save("nope", "Hi")).rejects.toThrow(/No such message/);
    expect(db.shopStore.update).not.toHaveBeenCalled();
  });
});
