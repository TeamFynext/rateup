import type { SubscriptionFeaturePathName } from "@/types/enums.ts";

import { getNestedProperty } from "../misc/obj.utils";

export function hasFeature(
  subscription: { features?: SubscriptionFeatures } | null | undefined,
  featurePath: SubscriptionFeaturePathName,
) {
  if (!subscription) return false;
  return getNestedProperty<{ active?: boolean }>(subscription.features, featurePath)?.active;
}

export function getSampleSubscriptionFeatures(count: number): SubscriptionFeatures {
  return {
    team: {
      count: { max: count },
      teamMember: { count: { max: count }, active: true },
      active: true,
    },
    webSurvey: {
      count: { max: count, monthlyResponseLimit: 1000 },
      active: true,
      encryption: { active: true },
      googleReview: { active: true },
      emailNotification: { active: true },
      htmlCodePage: { active: true },
      webhook: {
        active: false,
      },
    },
    whatsapp: {
      active: true,
      conversation: {
        active: true,
        count: { max: count },
      },
    },
    reputationManagement: { count: { max: count }, active: true },
    ai: {
      count: { completionTokens: 120000, promptTokens: 120000 },
      active: false,
    },
  };
}
