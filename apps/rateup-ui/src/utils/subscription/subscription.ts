import type { SubscriptionFeaturePathName } from "@/types/enums.ts";

import { getNestedProperty } from "../misc/obj.utils";

export function hasFeature(subscription, featurePath: SubscriptionFeaturePathName) {
  if (!subscription) return false;
  return getNestedProperty(subscription.features, featurePath)?.active;
}

export function getSampleSubscriptionFeatures(count: number): SubscriptionFeatures {
  return {
    menu: { count: { max: count, monthlyViewLimit: 1000 }, active: true },
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
      count: {
        max: count,
        monthlyMessageLimit: 100,
      },
      survey: {
        active: true,
        count: {
          max: count,
        },
      },
      campaign: {
        active: true,
        count: {
          max: count,
        },
      },
      flow: {
        active: true,
        count: {
          max: count,
        },
      },
      template: {
        active: true,
        count: {
          max: count,
        },
        carouselTemplate: {
          active: false,
          count: {
            max: 1,
          },
        },
      },
      automation: {
        active: true,
        count: { max: 1 },
        automationTrigger: { count: { max: 1000 }, active: true },
        leadAdAutomation: { count: { max: 0 }, active: false },
      },
    },
    reputationManagement: { count: { max: count }, active: true },
    ticket: { count: { max: count }, active: true },
    ai: {
      count: { completionTokens: 120000, promptTokens: 120000 },
      active: false,
    },
    loyalty: {
      action: { count: { max: count }, active: true },
      reward: { count: { max: count }, active: true },
      customer: { count: { max: count }, active: true },
      active: true,
    },
  };
}
