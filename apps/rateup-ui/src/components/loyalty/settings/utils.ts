import type { TFunction } from "i18next";

export enum LoyaltyTemplateTypes {
  CustomerRegistration = "CustomerRegistration",
  PointInformation = "PointInformation",
  Referral = "Referral",
  CustomerRemoval = "CustomerRemoval",
  RewardsIssued = "RewardsIssued",
  PointsIssued = "PointsIssued",
  PointsAdjusted = "PointsAdjusted",
  RewardIssued = "RewardIssued",
  RewardRedeemed = "RewardRedeemed",
  TierUpgraded = "TierUpgraded",
  Birthday = "Birthday",
  InactivityReminder = "InactivityReminder",
  PointsExpiryAlert = "PointsExpiryAlert",
  PointsExpired = "PointsExpired",
}

export function getLoyaltyTemplateLabel(type: LoyaltyTemplateTypes, translations: TFunction) {
  switch (type) {
    case LoyaltyTemplateTypes.PointsIssued:
      return {
        label: translations("Points Issued"),
        templateLabel: translations("WhatsApp Template for Points Issued"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Points")}, {{3}} - ${translations("Balance")}`,
      };
    case LoyaltyTemplateTypes.PointsAdjusted:
      return {
        label: translations("Points Adjusted"),
        templateLabel: translations("WhatsApp Template for Points Adjusted"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Points")}, {{3}} - ${translations("Balance")}`,
      };
    case LoyaltyTemplateTypes.RewardIssued:
      return {
        label: translations("Reward Issued"),
        templateLabel: translations("WhatsApp Template for Reward Issued"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Reward Name")}, {{3}} - ${translations("Redemption Code")}, {{4}} - ${translations("Cost")}`,
      };
    case LoyaltyTemplateTypes.RewardRedeemed:
      return {
        label: translations("Reward Redeemed"),
        templateLabel: translations("WhatsApp Template for Reward Redeemed"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Reward Name")}, {{3}} - ${translations("Redemption Code")}, {{4}} - ${translations("Cost")}`,
      };
    case LoyaltyTemplateTypes.TierUpgraded:
      return {
        label: translations("Tier Upgraded"),
        templateLabel: translations("WhatsApp Template for Tier Upgraded"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Tier Name")}`,
      };
    case LoyaltyTemplateTypes.Birthday:
      return {
        label: translations("Birthday"),
        templateLabel: translations("WhatsApp Template for Birthday"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Gift/Reward Name")}`,
      };
    case LoyaltyTemplateTypes.InactivityReminder:
      return {
        label: translations("Inactivity Reminder"),
        templateLabel: translations("WhatsApp Template for Inactivity Reminder"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Points Balance")}`,
      };
    case LoyaltyTemplateTypes.PointsExpiryAlert:
      return {
        label: translations("Points Expiry Alert"),
        templateLabel: translations("WhatsApp Template for Points Expiry Alert"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Points Balance")}, {{3}} - ${translations("Expiry Date")}`,
      };
    case LoyaltyTemplateTypes.PointsExpired:
      return {
        label: translations("Points Expired"),
        templateLabel: translations("WhatsApp Template for Points Expired"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Expired Points")}`,
      };
    default:
      return {
        label: "",
        templateLabel: "",
        templateDescription: "",
      };
  }
}
