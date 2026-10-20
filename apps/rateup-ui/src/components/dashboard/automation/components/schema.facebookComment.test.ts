import { describe, expect, test } from "vitest";

import { createRuleSchema, getTriggerEventsForPlatforms, isCommentTrigger } from "./schema.ts";

const triggers = (platforms: Parameters<typeof getTriggerEventsForPlatforms>[0]) =>
  getTriggerEventsForPlatforms(platforms).map((trigger) => trigger.value);

describe("the Facebook Page comment trigger", () => {
  test("is offered on Messenger only", () => {
    expect(triggers(["FACEBOOK"])).toContain("FACEBOOK_COMMENT");
    expect(triggers(["INSTAGRAM"])).not.toContain("FACEBOOK_COMMENT");
    expect(triggers(["WHATSAPP"])).not.toContain("FACEBOOK_COMMENT");
    expect(triggers(["FACEBOOK", "INSTAGRAM"])).not.toContain("FACEBOOK_COMMENT");
  });

  // Keyword conditions, the public-reply editor and the preview all follow this.
  test.each([
    ["INSTAGRAM_COMMENT", true],
    ["FACEBOOK_COMMENT", true],
    ["MESSAGE_RECEIVED", false],
    ["MESSENGER_REFERRAL", false],
    [undefined, false],
  ])("isCommentTrigger(%s) is %s", (trigger, expected) => {
    expect(isCommentTrigger(trigger)).toBe(expected);
  });

  test("saves with keywords and public replies", () => {
    const result = createRuleSchema.safeParse({
      platform: "FACEBOOK",
      platforms: ["FACEBOOK"],
      whatsappSettingsPhoneIds: ["page-1"],
      name: "Price comments",
      triggerEvent: "FACEBOOK_COMMENT",
      groups: [
        {
          operator: "AND",
          conditions: [{ field: "MESSAGE_BODY", operator: "CONTAINS", value: "price" }],
        },
      ],
      actions: [{ type: "SEND_MESSAGE", value: "Here is our price list" }],
      options: { instagramPublicReplies: ["Sent you a message 👋"] },
    });

    expect(result.success).toBe(true);
  });
});
