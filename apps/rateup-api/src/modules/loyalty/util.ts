import { getLoyaltyProgramByOrg } from "./program/program.service.js";

/**
 * Fastify preHandler to require a loyalty program for the current org.
 * Attaches the program to request.loyaltyProgram if found, else sends 404.
 */
export async function requireLoyaltyProgram(request, reply) {
  const orgId = request.user?.orgId;
  if (!orgId) {
    return reply.code(400).send({ error: "Missing orgId in user context" });
  }
  const program = await getLoyaltyProgramByOrg(orgId);
  if (!program) {
    return reply.code(404).send({ error: "Loyalty program not found" });
  }
  request.loyaltyProgram = program;
}
export enum LoyaltyActionType {
  ReferralPurchase = "Referral Purchase",
  DirectPurchase = "Direct Purchase",
  CustomerRegistration = "Customer Registration",
  FeedBack = "FeedBack",
}
export const isLReferralAction = (actionType) =>
  [LoyaltyActionType.ReferralPurchase].includes(actionType);

export const isPurchaseAction = (actionType) =>
  [LoyaltyActionType.ReferralPurchase, LoyaltyActionType.DirectPurchase].includes(actionType);

export const parsePhoneforWa = (phone: string) => (phone?.startsWith("+") ? phone.slice(1) : phone);

export enum RewardTypes {
  FixedAmountDiscount = "Fixed Amount Discount",
  VariableDiscount = "Variable Discount",
  PercentageOff = "Percentage Off",
  FreeProduct = "Free Product",
  GiftCard = "Gift Card",
}
