import { useExtracted } from "next-intl";

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
}

export function getLoyaltyTemplateLabel(
  type: LoyaltyTemplateTypes,
  translations: any,
) {
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
        templateLabel: translations(
          "WhatsApp Template for Inactivity Reminder",
        ),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}, {{2}} - ${translations("Points Balance")}`,
      };
    default:
      return {
        label: "",
        templateLabel: "",
        templateDescription: "",
      };
  }
}
