import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn() } }));
vi.mock("../../meta/shared/metaMessage.service.js", () => ({ sendMetaMessage: vi.fn() }));
vi.mock("../../loyalty/messaging/channels/whatsapp/session.js", () => ({
  findOpenSession: vi.fn(),
}));
vi.mock("../../meta/whatsapp/templates/templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));

const {
  SHOP_MESSAGE_CATALOG,
  paramsFor,
  renderShopBody,
  shopBodyProblem,
  templateBodyFor,
  templateParamText,
} = await import("./messageCatalog.js");
const { notificationSetting, templateBodyParams } = await import("./notify.js");
const { mergeNotifications } = await import("./store.service.js");

describe("the catalog", () => {
  test("keeps name, order number and total first, as templates mapped before it were sent", () => {
    for (const key of ["placed", "paid", "shipped", "cancelled", "delivered"] as const) {
      expect(SHOP_MESSAGE_CATALOG[key].params.slice(0, 3)).toEqual([
        "name",
        "orderNumber",
        "total",
      ]);
    }
    expect(SHOP_MESSAGE_CATALOG.shipped.params[3]).toBe("trackingUrl");
  });

  test("every default uses only its own variables", () => {
    for (const [key, d] of Object.entries(SHOP_MESSAGE_CATALOG)) {
      expect(shopBodyProblem(key as never, d.defaultBody), key).toBeNull();
    }
  });

  test("template names are unique", () => {
    const names = Object.values(SHOP_MESSAGE_CATALOG).map((d) => d.templateName);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("rendering", () => {
  test("fills variables in catalog order", () => {
    const params = paramsFor("shipped", { name: "Ana", orderNumber: "#7", carrier: "DHL" });
    expect(renderShopBody(SHOP_MESSAGE_CATALOG.shipped.defaultBody, params)).toBe(
      "Your order #7 is on its way. Carrier: DHL.",
    );
  });

  test("drops an optional segment whose variable is empty", () => {
    const params = paramsFor("shipped", { orderNumber: "#7" });
    expect(renderShopBody(SHOP_MESSAGE_CATALOG.shipped.defaultBody, params)).toBe(
      "Your order #7 is on its way.",
    );
  });

  test("rejects a variable the message doesn't have", () => {
    expect(shopBodyProblem("packed", "Order {{2}} packed")).toBeNull();
    expect(shopBodyProblem("packed", "Order {{9}} packed")).toMatch(/\{\{9\}\}/);
    expect(shopBodyProblem("packed", "   ")).not.toBeNull();
  });
});

describe("a store's setting", () => {
  test("falls back to the catalog's switch and words", () => {
    expect(notificationSetting(null, "packed")).toMatchObject({
      enabled: false,
      body: SHOP_MESSAGE_CATALOG.packed.defaultBody,
      customBody: false,
    });
    expect(notificationSetting(null, "shipped").enabled).toBe(true);
  });

  test("uses the store's own words", () => {
    const s = notificationSetting({ shipped: { body: "On its way, {{1}}!" } }, "shipped");
    expect(s).toMatchObject({ body: "On its way, {{1}}!", customBody: true });
  });

  test("a new message follows the switch of the event it used to ride on", () => {
    const saved = { placed: { enabled: false } };
    expect(notificationSetting(saved, "bank_transfer").enabled).toBe(false);
    const own = { ...saved, cod_confirm: { enabled: true } };
    expect(notificationSetting(own, "cod_confirm").enabled).toBe(true);
  });

  test("never borrows another message's template, so a card shows what it sends", () => {
    const saved = { placed: { waTemplateId: "picked-for-placed" } };
    expect(notificationSetting(saved, "cod_confirm")).toMatchObject({
      waTemplateId: null,
      template: null,
    });
  });
});

describe("template parameters", () => {
  const template = (text: string) => [{ type: "BODY", text }];

  test("sends only as many as the template uses", () => {
    expect(templateBodyParams(template("Hi {{1}}, order {{2}}"), ["Ana", "#7", "$20"])).toEqual([
      "Ana",
      "#7",
    ]);
  });

  test("never sends an empty value or a newline", () => {
    expect(templateBodyParams(template("{{1}} {{2}}"), ["", "a\nb"])).toEqual(["-", "a · b"]);
    expect(templateParamText("  x   y\t z ")).toBe("x y z");
  });
});

describe("saving notifications", () => {
  test("keeps the words when a page saves only the switches", () => {
    const saved = { shipped: { enabled: true, body: "Mine {{2}}" }, packed: { enabled: false } };
    expect(mergeNotifications(saved, { shipped: { enabled: false, waTemplateId: null } })).toEqual({
      shipped: { enabled: false, waTemplateId: null, body: "Mine {{2}}" },
      packed: { enabled: false },
    });
  });

  test("a null body goes back to the default", () => {
    const merged = mergeNotifications({ shipped: { body: "Mine" } }, { shipped: { body: null } });
    expect(merged.shipped?.body).toBeNull();
  });
});

describe("the store's words as a WhatsApp template", () => {
  test("numbers variables from {{1}} in order, and remembers what each stands for", () => {
    expect(templateBodyFor("packed", "Order {{2}} is packed.")).toEqual({
      text: "Order {{1}} is packed.",
      params: [2],
      examples: ["#1001"],
    });
    const twice = templateBodyFor("placed", "Hi {{3}} and {{1}}, {{3}} again ok");
    expect(twice).toMatchObject({ text: "Hi {{1}} and {{2}}, {{1}} again ok", params: [3, 1] });
  });

  test("leaves out optional words and writes the button's link into the text", () => {
    const shipped = templateBodyFor("shipped", SHOP_MESSAGE_CATALOG.shipped.defaultBody);
    expect(shipped).toEqual({
      text: "Your order {{1}} is on its way.\n\nTrack your parcel at {{2}} any time.",
      params: [2, 4],
      examples: ["#1001", "https://track.example.com/1001"],
    });
  });

  test("doesn't add the link twice when the store wrote it in", () => {
    const own = templateBodyFor("payment_reminder", "Pay {{3}} here {{4}} please");
    expect(own).toMatchObject({ text: "Pay {{1}} here {{2}} please", params: [3, 4] });
  });

  test("refuses words that start or end with a variable", () => {
    expect(templateBodyFor("packed", "{{2}} is packed")).toHaveProperty("problem");
    expect(templateBodyFor("packed", "Packed: {{2}}.")).toHaveProperty("problem");
  });

  test("every default makes a template Meta takes", () => {
    for (const [key, d] of Object.entries(SHOP_MESSAGE_CATALOG)) {
      expect(templateBodyFor(key as never, d.defaultBody), key).not.toHaveProperty("problem");
    }
  });
});

describe("which template a message sends", () => {
  test("its own carries the variable map", () => {
    const saved = {
      cod_confirm: { waTemplateId: "t1", templateMap: { waTemplateId: "t1", params: [2, 3] } },
    };
    expect(notificationSetting(saved, "cod_confirm").template).toEqual({
      id: "t1",
      params: [2, 3],
    });
  });

  test("one picked by hand since is sent values in order", () => {
    const saved = {
      shipped: { waTemplateId: "mine", templateMap: { waTemplateId: "t1", params: [2] } },
    };
    expect(notificationSetting(saved, "shipped").template).toEqual({ id: "mine" });
  });

  test("a mapped template sends the values it stands for", () => {
    expect(templateBodyParams([], ["Ana", "#7", "$20", "https://t"], [2, 4])).toEqual([
      "#7",
      "https://t",
    ]);
  });
});

describe("a message too long for WhatsApp", () => {
  test("says how much to cut once the link line is added", () => {
    const long = `Order {{2}} ${"x".repeat(1000)} done`;
    expect(templateBodyFor("shipped", long)).toEqual({
      problem: expect.stringMatching(/Remove \d+ characters/),
    });
  });
});
