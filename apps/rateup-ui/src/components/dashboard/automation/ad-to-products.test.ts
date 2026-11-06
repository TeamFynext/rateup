import { describe, expect, test } from "vite-plus/test";

import { findAutomationTemplate, templateFormValues, withProduct } from "./automation-templates.ts";
import { createRuleSchema } from "./components/schema.ts";

describe("ad to products", () => {
  const values = withProduct(
    templateFormValues(findAutomationTemplate("ad-to-products")),
    "11111111-1111-4111-8111-111111111111",
  );

  test("is a WhatsApp rule for every ad that sends the product", () => {
    expect(values).toMatchObject({
      platforms: ["WHATSAPP"],
      triggerEvent: "WHATSAPP_AD_REFERRAL",
      actions: [
        {
          type: "SEND_SHOP_PRODUCTS",
          value: { productIds: ["11111111-1111-4111-8111-111111111111"] },
        },
      ],
    });
  });

  test("saves on WhatsApp, narrowed to an ad", () => {
    const rule = {
      ...values,
      whatsappSettingsPhoneIds: ["phone-1"],
      options: { ...values.options, adIds: ["120210000000000001"] },
    };
    expect(createRuleSchema.safeParse(rule).success).toBe(true);
  });

  test("cannot run on Instagram", () => {
    const rule = {
      ...values,
      platform: "INSTAGRAM",
      platforms: ["INSTAGRAM"],
      whatsappSettingsPhoneIds: ["iba-1"],
    };
    const result = createRuleSchema.safeParse(rule);
    expect(result.error?.issues.map((i) => i.path.join("."))).toContain("triggerEvent");
  });
});
