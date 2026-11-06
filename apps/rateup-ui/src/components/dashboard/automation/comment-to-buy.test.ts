import { describe, expect, test } from "vite-plus/test";

import { findAutomationTemplate, templateFormValues, withProduct } from "./automation-templates.ts";
import { actionPart } from "./rule-sentence.ts";

const names = () => undefined;

describe("comment to buy", () => {
  test("a template opened from a product starts with that product", () => {
    const values = withProduct(
      templateFormValues(findAutomationTemplate("live-drop")),
      "product-1",
    );
    expect(values.actions[0]).toMatchObject({
      type: "SEND_SHOP_PRODUCTS",
      value: { productIds: ["product-1"], dropLimit: 20 },
    });
  });

  test("reads as a sentence, with the drop size", () => {
    const part = actionPart(
      { type: "SEND_SHOP_PRODUCTS", value: { productIds: ["a", "b"], dropLimit: 5 } },
      names,
    );
    expect(part).toMatchObject({ role: "action", text: "send 2 products to buy, first 5 only" });
  });

  test("is unfinished until it has products", () => {
    const part = actionPart({ type: "SEND_SHOP_PRODUCTS", value: { productIds: [] } }, names);
    expect(part.role).toBe("missing");
  });
});
