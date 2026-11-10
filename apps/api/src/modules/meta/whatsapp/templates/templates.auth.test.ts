import { describe, expect, test } from "vite-plus/test";

describe("the message-limit preHandlers", () => {
  test("no longer exist", async () => {
    const authModule = await import("./templates.auth.js");

    expect(Object.keys(authModule)).not.toContain("verifyMessageMonthlyLimitRestriction");
    expect(Object.keys(authModule)).not.toContain("verifyTemplateMessageLimit");
  });
});
