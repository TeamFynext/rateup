import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

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

export const parsePhoneforWa = (phone: string) => phone?.replace(/^\++/, "") ?? phone;

/**
 * A phone number as `Contact.phone` stores it — E.164 digits with no "+" — or null when
 * it is not a real number for the programme's country. Used on the public join form,
 * where the only check before this was "not empty".
 */
export function normalisePhone(raw: string, defaultCountry: string): string | null {
  const parsed = parsePhoneNumberFromString(raw.trim(), defaultCountry as CountryCode);
  if (!parsed?.isValid()) return null;
  return parsed.number.replace(/^\+/, "");
}

export enum RewardTypes {
  FixedAmountDiscount = "Fixed Amount Discount",
  VariableDiscount = "Variable Discount",
  PercentageOff = "Percentage Off",
  FreeProduct = "Free Product",
  GiftCard = "Gift Card",
}
