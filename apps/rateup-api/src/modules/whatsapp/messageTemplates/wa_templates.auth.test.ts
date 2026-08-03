import { describe, expect, test } from "vitest";

// verifyMessageMonthlyLimitRestriction and verifyTemplateMessageLimit were tested
// here. Both had their entire bodies commented out behind a "TODO: re-check", so
// they were no-ops that let every request past while reading — from the route
// files and their eleven call sites — like working plan enforcement.
//
// They are gone, along with campaign.auth.ts's identical
// verifyMessageMonthlyLimitRestrictionForCampaign. The product has no per-message
// limit; it has a CONVERSATION limit, and that one is live: assertWithinConversationLimit
// in whatsappSurvey/wasurvey.auth.ts, called by sendMessage on every outbound path.
// Every route these dead gates guarded sends through sendMessage, so all three are
// already metered — see wasurvey.auth.test.ts for its coverage.
//
describe("the message-limit preHandlers", () => {
  test("no longer exist", async () => {
    const authModule = await import("./wa_templates.auth.js");

    expect(Object.keys(authModule)).not.toContain("verifyMessageMonthlyLimitRestriction");
    expect(Object.keys(authModule)).not.toContain("verifyTemplateMessageLimit");
  });
});
