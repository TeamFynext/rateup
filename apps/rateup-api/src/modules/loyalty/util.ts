import { LoyaltyActionType } from "./actions/actions.schema";

export const isLReferralAction = (actionType) =>
  [LoyaltyActionType.ReferralPurchase].includes(actionType);

export const isPurchaseAction = (actionType) =>
  [
    LoyaltyActionType.ReferralPurchase,
    LoyaltyActionType.DirectPurchase,
  ].includes(actionType);

export const parsePhoneforWa = (phone: string) =>
  phone && phone.startsWith("+") ? phone.slice(1) : phone;
