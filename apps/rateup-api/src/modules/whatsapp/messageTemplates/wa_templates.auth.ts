// This file held verifyMessageMonthlyLimitRestriction and verifyTemplateMessageLimit.
//
// Both had their entire bodies commented out behind a "TODO: re-check", so they
// were no-ops that let every request past — while reading, from the route files
// and their eleven call sites, exactly like working plan enforcement. They were
// the preHandler on the two routes that send billable template messages, and the
// campaign equivalent in campaign.auth.ts was disabled the same way.
//
// DELETED rather than re-enabled: the product no longer has a per-message limit.
// It has a CONVERSATION limit, and that one is live and enforced —
// assertWithinConversationLimit in whatsappSurvey/wasurvey.auth.ts, called by
// sendMessage (wasurvey.service.ts) on every outbound path, and by all ten
// Instagram senders. Every route these dead gates guarded sends through
// sendMessage, so they are already metered.
//
// See issues.txt 14.1(a) and 17.1.
export {};
