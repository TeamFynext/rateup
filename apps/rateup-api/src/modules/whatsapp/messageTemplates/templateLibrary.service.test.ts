import { describe, expect, it } from "vitest";
import { normalizeLibraryEntry, toMetaButtonInputs } from "./templateLibrary.service.js";
import { createFromLibrarySchema } from "./templateLibrary.schema.js";

describe("normalizeLibraryEntry", () => {
  it("reads Meta's raw entry and derives what its buttons need", () => {
    const entry = normalizeLibraryEntry({
      name: "order_canceled_4",
      language: "en_US",
      category: "UTILITY",
      topic: "ORDER_MANAGEMENT",
      usecase: "ORDER_OR_TRANSACTION_CANCEL",
      header: "Order canceled",
      body: "Hello {{1}}, your order {{2}} has been canceled.",
      buttons: [
        { type: "URL", text: "Order details" },
        { type: "QUICK_REPLY", text: "Thanks" },
        { type: "PHONE_NUMBER", text: "Call us" },
      ],
    });
    expect(entry.name).toBe("order_canceled_4");
    expect(entry.header_type).toBe("TEXT");
    expect(entry.pre_approved).toBe(false);
    expect(entry.required_inputs.buttons).toEqual([
      { index: 0, type: "URL", text: "Order details", needs: "url" },
      { index: 2, type: "PHONE_NUMBER", text: "Call us", needs: "phone_number" },
    ]);
  });

  it("keeps the inputs and flags an entry states itself", () => {
    const entry = normalizeLibraryEntry({
      library_template_name: "welcome_1",
      body: "Welcome to {{business_name}}",
      pre_approved: true,
      buttons: [],
      required_inputs: { buttons: [], body_inputs: [{ param_name: "business_name" }] },
    });
    expect(entry.name).toBe("welcome_1");
    expect(entry.pre_approved).toBe(true);
    expect(entry.required_inputs.body_inputs).toEqual([{ param_name: "business_name" }]);
  });
});

describe("toMetaButtonInputs", () => {
  it("orders by index and builds Meta's URL and phone shapes", () => {
    expect(
      toMetaButtonInputs([
        { index: 1, type: "PHONE_NUMBER", phoneNumber: "+16315551010" },
        {
          index: 0,
          type: "URL",
          url: "https://shop.example.com/orders/{{1}}",
          urlSuffixExample: "1001",
        },
      ]),
    ).toEqual([
      {
        type: "URL",
        url: {
          base_url: "https://shop.example.com/orders/{{1}}",
          url_suffix_example: "https://shop.example.com/orders/1001",
        },
      },
      { type: "PHONE_NUMBER", phone_number: "+16315551010" },
    ]);
  });
});

describe("createFromLibrarySchema", () => {
  const base = {
    whatsappSettingsPhoneId: "123",
    name: "order_canceled",
    libraryTemplateName: "order_canceled_4",
    language: "en_US",
  };
  it("asks for a URL button's address", () => {
    const result = createFromLibrarySchema.safeParse({
      ...base,
      buttons: [{ index: 0, type: "URL" }],
    });
    expect(result.success).toBe(false);
  });
  it("accepts a filled-in entry", () => {
    const result = createFromLibrarySchema.safeParse({
      ...base,
      buttons: [{ index: 0, type: "URL", url: "https://example.com/orders" }],
    });
    expect(result.success).toBe(true);
  });
});
