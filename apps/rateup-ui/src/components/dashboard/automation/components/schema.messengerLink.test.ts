import { describe, expect, test } from "vitest";

import { createRuleSchema, getTriggerEventsForPlatforms } from "./schema.ts";

const triggers = (platforms: Parameters<typeof getTriggerEventsForPlatforms>[0]) =>
  getTriggerEventsForPlatforms(platforms).map((trigger) => trigger.value);

const linkRule = (options: Record<string, unknown> = {}) => ({
  platform: "FACEBOOK",
  platforms: ["FACEBOOK"],
  whatsappSettingsPhoneIds: ["page-1"],
  name: "Summer sale link",
  triggerEvent: "MESSENGER_REFERRAL",
  groups: [],
  actions: [{ type: "SEND_MESSAGE", value: "Hi!" }],
  options,
});

describe("the m.me link trigger", () => {
  test("is offered on Messenger", () => {
    expect(triggers(["FACEBOOK"])).toContain("MESSENGER_REFERRAL");
  });

  test.each([[["WHATSAPP"]], [["INSTAGRAM"]], [["FACEBOOK", "INSTAGRAM"]]] as const)(
    "is not offered on %j",
    (platforms) => {
      expect(triggers(platforms)).not.toContain("MESSENGER_REFERRAL");
    },
  );

  test("saves with or without a ref", () => {
    expect(createRuleSchema.safeParse(linkRule()).success).toBe(true);
    expect(createRuleSchema.safeParse(linkRule({ messengerRef: "summer_sale" })).success).toBe(
      true,
    );
  });

  // Mirrors the API, which would refuse it.
  test("refuses a ref with characters Meta does not allow", () => {
    const result = createRuleSchema.safeParse(linkRule({ messengerRef: "summer sale!" }));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["options", "messengerRef"]);
  });
});
