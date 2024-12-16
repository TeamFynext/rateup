import { LoyaltyActionType } from "./actions/actions.schema";

export const isLReferralAction = (actionType) =>
  [LoyaltyActionType.ReferFriend, LoyaltyActionType.ReferralPurchase].includes(
    actionType,
  );
