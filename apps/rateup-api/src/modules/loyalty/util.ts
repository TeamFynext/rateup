export enum LoyaltyActionType {
  ReferralPurchase = "Referral Purchase",
  DirectPurchase = "Direct Purchase",
  CustomerRegistration = "Customer Registration",
  FeedBack = "FeedBack",
}
export const isLReferralAction = (actionType) =>
  [LoyaltyActionType.ReferralPurchase].includes(actionType);

export const isPurchaseAction = (actionType) =>
  [
    LoyaltyActionType.ReferralPurchase,
    LoyaltyActionType.DirectPurchase,
  ].includes(actionType);

export const parsePhoneforWa = (phone: string) =>
  phone?.startsWith("+") ? phone.slice(1) : phone;

export enum RewardTypes {
  FixedAmountDiscount = "Fixed Amount Discount",
  VariableDiscount = "Variable Discount",
  PercentageOff = "Percentage Off",
  FreeProduct = "Free Product",
  GiftCard = "Gift Card",
}
