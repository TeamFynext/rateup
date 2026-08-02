/*
 * `requireLoyaltyProgram` used to live here: a Fastify preHandler, written,
 * exported and documented, and registered on NO route — every controller in the
 * module resolves the program inline instead. It is deleted rather than adopted,
 * because a route that picked it up would have got behaviour nothing else in the
 * module relies on: the program attached to `request.loyaltyProgram` rather than
 * resolved where it is used, and a 400 for a missing org where every handler
 * answers 404 for a missing program. See issues.txt 20.32.
 */

export enum LoyaltyActionType {
  ReferralPurchase = "Referral Purchase",
  DirectPurchase = "Direct Purchase",
  CustomerRegistration = "Customer Registration",
  FeedBack = "FeedBack",
}
export const isLReferralAction = (actionType: LoyaltyActionType) =>
  [LoyaltyActionType.ReferralPurchase].includes(actionType);

export const isPurchaseAction = (actionType: LoyaltyActionType) =>
  [LoyaltyActionType.ReferralPurchase, LoyaltyActionType.DirectPurchase].includes(actionType);

/**
 * Strips leading "+" signs from a phone number.
 *
 * ALL of them: `slice(1)` removed exactly one, so "++9199…" survived with a plus
 * still on the front and every downstream lookup on that number missed.
 * See issues.txt 20.32.
 */
export const parsePhoneforWa = (phone: string) => phone?.replace(/^\++/, "") ?? phone;

export enum RewardTypes {
  FixedAmountDiscount = "Fixed Amount Discount",
  VariableDiscount = "Variable Discount",
  PercentageOff = "Percentage Off",
  FreeProduct = "Free Product",
  GiftCard = "Gift Card",
}
