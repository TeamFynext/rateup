import { describe, expect, test } from "vitest";

describe("the message-limit preHandlers", () => {
  test("no longer exist", async () => {
    const authModule = await import("./wa_templates.auth.js");

    expect(Object.keys(authModule)).not.toContain("verifyMessageMonthlyLimitRestriction");
    expect(Object.keys(authModule)).not.toContain("verifyTemplateMessageLimit");
  });
});
