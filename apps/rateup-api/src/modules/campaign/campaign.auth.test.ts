import { describe, expect, test } from "vitest";

describe("campaign.auth.ts", () => {
  // verifyMessageMonthlyLimitRestrictionForCampaign is gone: its body was commented
  // out behind a "TODO: re-check", exactly like its two siblings in
  // wa_templates.auth.ts, so it enforced nothing on the campaign send route while
  // reading like a plan gate. The product has a CONVERSATION limit, not a message
  // limit, and sendMessage enforces that on every outbound path.
  //
  // getUsageStats and getSubscription went with it.kept them on
  // the grounds that they were exported and harmless, but their last remaining
  // caller was the dead message-limit block inside the campaign dispatcher, removed
  // under— so nothing reads them now.
  //
  // getCampaignParticipants went too: private, never called, and it looked a
  // participant up by id with no campaign or org filter, which is exactly the shape
  //is about. Better deleted than left waiting for a caller.
  //
  test("exports nothing — every piece of the dead message limit is gone", async () => {
    const auth = await import("./campaign.auth.js");

    expect(Object.keys(auth)).toEqual([]);
  });
});
