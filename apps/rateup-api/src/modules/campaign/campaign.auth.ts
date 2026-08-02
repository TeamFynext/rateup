// This file is empty on purpose.
//
// verifyMessageMonthlyLimitRestrictionForCampaign stood here. Its body was
// commented out behind a "TODO: re-check" exactly like its two siblings in
// wa_templates.auth.ts, so it enforced nothing while reading like a plan gate on
// the campaign send route. Deleted with them: the product has a conversation
// limit, not a message limit, and sendMessage enforces it.
//
// getUsageStats and getSubscription went with it. issues.txt 17.1 kept them on the
// grounds that they were exported and harmless, but their last remaining caller
// was the dead message-limit block in wasurvey.controller.ts, removed under
// issues.txt 17.10 — so nothing reads them now. Anything wanting a subscription
// should use subscription.service.ts's own getSubscription.
//
// getCampaignParticipants — private, never called, and it looked a participant up
// by id with no campaign or org filter — went too, rather than being left as an
// unscoped read waiting for its first caller.
//
// See issues.txt 14.1(a), 17.1 and 17.10.
export {};
