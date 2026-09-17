/**
 * Feature paths inside a subscription's stored `features` blob.
 *
 * These are dotted lookup paths, not labels — `hasFeature` walks them into the JSON the
 * server sends, so a value that does not match the server's own enum silently resolves to
 * `undefined` and reads as "not on your plan" for *every* org, paying ones included.
 *
 * Kept deliberately in step with `SubscriptionFeaturePathName` in
 * `rateup-api/src/types/enums.ts`. This list used to carry eleven paths the server had
 * dropped (`loyalty`, `loyalty.*`, `menu`, `ticket`, `reputationManagement`,
 * `whatsapp.flow`, `whatsapp.template*`, `whatsapp.automation*`) and was missing the four
 * tier gates that actually sell the paid plans. Loyalty was the costly one: the server
 * gates it at `whatsapp.loyalty`, and the entry here said `loyalty`.
 */
export enum SubscriptionFeaturePathName {
  WebSurvey = "webSurvey",
  EmailNotification = "webSurvey.emailNotification",
  GoogleReview = "webSurvey.googleReview",
  Encryption = "webSurvey.encryption",
  Webhook = "webSurvey.webhook",
  Whatsapp = "whatsapp",
  WhatsappConversation = "whatsapp.conversation",
  /** The four tier gates: open from Plus, shut on Free. */
  WhatsappCampaign = "whatsapp.campaign",
  WhatsappLoyalty = "whatsapp.loyalty",
  WhatsappReferrals = "whatsapp.referrals",
  WhatsappCatalog = "whatsapp.catalog",
  Team = "team",
  TeamMember = "team.teamMember",
  AI = "ai",
}
