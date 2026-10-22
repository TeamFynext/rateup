import { describe, expect, test } from "vitest";
import { createRuleSchema, updateRuleSchema } from "./wa_rule.schema.js";

const base = {
  whatsappSettingsPhoneIds: ["page-1"],
  name: "Welcome",
  triggerEvent: "MESSAGE_RECEIVED",
  actions: [{ type: "SEND_MESSAGE", value: "Hi" }],
};

describe("Facebook (Messenger) rules", () => {
  test("accept a message trigger with a plain message action", () => {
    expect(createRuleSchema.safeParse({ ...base, platform: "FACEBOOK" }).success).toBe(true);
  });

  test.each(["INSTAGRAM_COMMENT", "INSTAGRAM_STORY_MENTION", "INSTAGRAM_REFERRAL"])(
    "reject the Instagram-only trigger %s",
    (triggerEvent) => {
      const result = createRuleSchema.safeParse({ ...base, platform: "FACEBOOK", triggerEvent });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toEqual(["triggerEvent"]);
    },
  );

  test.each(["SEND_TEMPLATE", "SEND_FLOW"])("reject the WhatsApp-only action %s", (type) => {
    const result = createRuleSchema.safeParse({
      ...base,
      platform: "FACEBOOK",
      actions: [{ type: "SEND_MESSAGE", value: "Hi" }, { type }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["actions", 1, "type"]);
  });

  test("are checked on update when the platform is sent", () => {
    expect(
      updateRuleSchema.safeParse({ platform: "FACEBOOK", triggerEvent: "INSTAGRAM_COMMENT" })
        .success,
    ).toBe(false);
  });
});

describe("other platforms are unaffected", () => {
  test("an Instagram rule may still use its own triggers", () => {
    expect(
      createRuleSchema.safeParse({
        ...base,
        platform: "INSTAGRAM",
        triggerEvent: "INSTAGRAM_COMMENT",
      }).success,
    ).toBe(true);
  });

  test("a WhatsApp rule may still send a template", () => {
    expect(
      createRuleSchema.safeParse({ ...base, actions: [{ type: "SEND_TEMPLATE", value: "t" }] })
        .success,
    ).toBe(true);
  });
});

describe("rules on several channels", () => {
  const multi = { ...base, platforms: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"] };

  test("accept a shared trigger with actions every channel can run", () => {
    expect(
      createRuleSchema.safeParse({
        ...multi,
        triggerEvent: "CONTACT_CREATED",
        actions: [
          { type: "SEND_MESSAGE", value: "Welcome!" },
          { type: "ATTACH_LABEL", value: "label-1" },
        ],
      }).success,
    ).toBe(true);
  });

  test.each(["INSTAGRAM_COMMENT", "SHOPIFY_EVENT", "WOOCOMMERCE_EVENT"])(
    "reject the single-channel trigger %s",
    (triggerEvent) => {
      const result = createRuleSchema.safeParse({
        ...multi,
        triggerEvent,
        options: { shopifyEvent: "ORDERS_CREATE", wooEvent: "completed" },
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toEqual(["triggerEvent"]);
    },
  );

  test.each(["SEND_TEMPLATE", "TRIGGER_CHATBOT"])("reject the action %s", (type) => {
    const result = createRuleSchema.safeParse({ ...multi, actions: [{ type, value: "x" }] });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["actions", 0, "type"]);
  });

  test("let a WhatsApp-only list keep templates", () => {
    expect(
      createRuleSchema.safeParse({
        ...base,
        platforms: ["WHATSAPP"],
        actions: [{ type: "SEND_TEMPLATE", value: "t" }],
      }).success,
    ).toBe(true);
  });
});

describe("comment-to-buy rules", () => {
  const product = "11111111-1111-4111-8111-111111111111";
  const sell = (platform: string, value: unknown) =>
    createRuleSchema.safeParse({
      ...base,
      platform,
      triggerEvent: "INSTAGRAM_COMMENT",
      actions: [{ type: "SEND_SHOP_PRODUCTS", value }],
    });

  test("accept products and a drop size on Instagram", () => {
    expect(sell("INSTAGRAM", { productIds: [product], dropLimit: 20 }).success).toBe(true);
  });

  test("need at least one product", () => {
    const result = sell("INSTAGRAM", { productIds: [] });
    expect(result.error?.issues[0].path).toEqual(["actions", 0, "value"]);
  });

  test("also go out on WhatsApp, but not Messenger", () => {
    const products = [{ type: "SEND_SHOP_PRODUCTS", value: { productIds: [product] } }];
    expect(createRuleSchema.safeParse({ ...base, actions: products }).success).toBe(true);
    const result = createRuleSchema.safeParse({ ...base, platform: "FACEBOOK", actions: products });
    expect(result.error?.issues[0].path).toEqual(["actions", 0, "type"]);
  });
});

describe("came-from-an-ad rules", () => {
  const adRule = (platform: string, options?: unknown) =>
    createRuleSchema.safeParse({
      ...base,
      platform,
      triggerEvent: "WHATSAPP_AD_REFERRAL",
      options,
    });

  test("run on WhatsApp, narrowed to ads or words", () => {
    expect(adRule("WHATSAPP", { adIds: ["120210000000001"], adMatch: "summer" }).success).toBe(
      true,
    );
  });

  test("are WhatsApp only", () => {
    expect(adRule("INSTAGRAM").error?.issues[0].path).toEqual(["triggerEvent"]);
  });
});

describe("m.me link rules", () => {
  const link = { ...base, triggerEvent: "MESSENGER_REFERRAL" };

  test("accept the link trigger on Messenger, with or without a ref", () => {
    expect(createRuleSchema.safeParse({ ...link, platform: "FACEBOOK" }).success).toBe(true);
    expect(
      createRuleSchema.safeParse({
        ...link,
        platform: "FACEBOOK",
        options: { messengerRef: "summer_sale" },
      }).success,
    ).toBe(true);
  });

  test.each(["WHATSAPP", "INSTAGRAM"])("reject the link trigger on %s", (platform) => {
    const result = createRuleSchema.safeParse({ ...link, platform });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("This trigger is only available for Messenger");
  });

  test("reject it on several channels at once", () => {
    const result = createRuleSchema.safeParse({ ...link, platforms: ["FACEBOOK", "INSTAGRAM"] });

    expect(result.success).toBe(false);
  });

  test("reject a ref with characters Meta does not allow", () => {
    const result = createRuleSchema.safeParse({
      ...link,
      platform: "FACEBOOK",
      options: { messengerRef: "summer sale!" },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["options", "messengerRef"]);
  });
});

describe("Facebook comment rules", () => {
  const onComment = { ...base, triggerEvent: "FACEBOOK_COMMENT" };

  test("accept the comment trigger on Messenger, with public replies", () => {
    expect(
      createRuleSchema.safeParse({
        ...onComment,
        platform: "FACEBOOK",
        options: { instagramPublicReplies: ["Sent you a message!"] },
      }).success,
    ).toBe(true);
  });

  test.each(["WHATSAPP", "INSTAGRAM"])("reject it on %s", (platform) => {
    const result = createRuleSchema.safeParse({ ...onComment, platform });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("This trigger is only available for Messenger");
  });
});
