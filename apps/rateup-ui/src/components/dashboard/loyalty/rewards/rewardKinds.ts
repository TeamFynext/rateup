import { IconCoin, IconGift, IconMessageStar, IconTicket, type Icon } from "@tabler/icons-react";
import type { TFunction } from "i18next";

import type { LoyaltyRewardType } from "@/backend/loyalty/reward.api";

export interface RewardKindMeta {
  label: string;
  /** One line for the type picker: what the customer does to get it. */
  blurb: string;
  icon: Icon;
  /** The type tag and the icon tile share this tone. */
  toneClass: string;
}

export const REWARD_KIND_ORDER: readonly LoyaltyRewardType[] = [
  "point",
  "coupon",
  "assigned",
  "review",
];

export function rewardKindMeta(
  t: TFunction,
  pointsName: string,
): Record<LoyaltyRewardType, RewardKindMeta> {
  return {
    point: {
      label: t("Points reward"),
      blurb: t("Customers spend their {points} on it — a discount, cashback or a free item.", {
        points: pointsName,
      }),
      icon: IconCoin,
      toneClass: "bg-primary/10 text-primary dark:bg-primary/20",
    },
    coupon: {
      label: t("Coupon"),
      blurb: t("A code any customer can use. No {points} needed.", { points: pointsName }),
      icon: IconTicket,
      toneClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
    },
    assigned: {
      label: t("Free gift"),
      blurb: t("Handed to a customer by you or by the referral program, each with its own code."),
      icon: IconGift,
      toneClass: "bg-green-600/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
    },
    review: {
      label: t("Review reward"),
      blurb: t("Thanks a customer for leaving a Google review after the feedback survey."),
      icon: IconMessageStar,
      toneClass: "bg-muted text-muted-foreground",
    },
  };
}
