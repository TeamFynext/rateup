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
